import { cookies } from 'next/headers'

async function fetchThoughts(username: string, token: string) {
  const response = await fetch(
    `https://api.github.com/repos/${username}/tinymind-blog/contents/content/thoughts.json`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error('Failed to fetch thoughts');
  }

  const data = await response.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return JSON.parse(content);
}

export default async function Home() {
  const clientID = process.env.GITHUB_ID
  const redirectUrl = process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/github'
  const ghOAuthLink = `https://github.com/login/oauth/authorize?client_id=${clientID}&redirect_uri=${redirectUrl}&scope=read:user,user:email,public_repo,workflow`
  const cookieStore = await cookies()

  const username = cookieStore.get('username')?.value
  const token = cookieStore.get('gh_token')?.value
  
  let thoughts = [];
  if (username && token) {
    try {
      thoughts = await fetchThoughts(username, token);
    } catch (error) {
      console.error('Error fetching thoughts:', error);
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="mb-4 text-xl font-bold">TinyMind Clone</div>
      
      {(!username || !token) ? (
        <a className="bg-pink-600 text-white px-4 py-2 rounded hover:bg-pink-700" href={ghOAuthLink}>
          Login with GitHub
        </a>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="font-medium">Welcome, {username}!</p>
            <a 
              href="/api/auth/logout"
              className="text-sm text-red-600 hover:text-red-800"
            >
              Logout
            </a>
          </div>
          
          <form action="/api/submit-thought" method="POST" className="space-y-3 border p-4 rounded">
            <h2 className="font-bold">Add a new thought</h2>
            <div>
              <label htmlFor="thought" className="block text-sm font-medium mb-1">
                Your thought:
              </label>
              <textarea 
                id="thought" 
                name="content" 
                rows={3} 
                className="w-full border rounded p-2"
                required
              />
            </div>
            <button 
              type="submit" 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Submit to GitHub
            </button>
          </form>

          {thoughts.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-bold">Your Thoughts</h2>
              <div className="space-y-3">
                {thoughts.map((thought: any) => (
                  <div key={thought.id} className="border rounded p-3">
                    <p className="text-sm text-gray-600">
                      {new Date(thought.date).toLocaleDateString()}
                    </p>
                    <p className="mt-1">{thought.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
