import { cookies } from 'next/headers'
import { Octokit } from '@octokit/rest'
import { REPO_NAME } from '@/lib/constants';
import { Thought } from '@/lib/types'
import { checkAndInitRepository } from '@/lib/github';

async function fetchThoughts(username: string, token: string) {
  const octokit = new Octokit({ auth: token });
  await checkAndInitRepository(username, token)

  try {
    const { data } = await octokit.repos.getContent({
      owner: username,
      repo: REPO_NAME,
      path: 'content/thoughts.json'
    });

    if ('content' in data) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return JSON.parse(content);
    }
    return [];
  } catch (error) {
    if ((error as { status?: number }).status === 404) return [];
    throw error;
  }
}

export default async function Home() {
  const clientID = process.env.GITHUB_ID
  const redirectUrl = process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/github'
  const ghOAuthLink = `https://github.com/login/oauth/authorize?client_id=${clientID}&redirect_uri=${redirectUrl}&scope=read:user,user:email,public_repo,workflow`
  const cookieStore = await cookies()
  const username = cookieStore.get('username')?.value
  const token = cookieStore.get('gh_token')?.value
  
  let thoughts: Thought[] = [];
  let error: string | null = null;

  if (username && token) {
    try {
      thoughts = await fetchThoughts(username, token);
    } catch (err) {
      console.error('Error fetching thoughts:', err);
      error = 'Failed to load thoughts. Please try again later.';
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

          {error && (
            <div className="text-red-600 p-3 border border-red-200 rounded bg-red-50">
              {error}
            </div>
          )}

          {thoughts.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-bold">Your Thoughts</h2>
              <div className="space-y-3">
                {thoughts.map((thought: Thought) => (
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
