import { cookies } from 'next/headers'

export default async function Home() {
  const clientID = process.env.GITHUB_ID
  const redirectUrl = process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/github'
  const ghOAuthLink = `https://github.com/login/oauth/authorize?client_id=${clientID}&redirect_uri=${redirectUrl}&scope=read:user,user:email`
  const cookieStore = cookies()
  const username = (await cookieStore).get('username')?.value
  return (
    <div>
      <div>hi</div>
      <a className="bg-pink-600" href={ghOAuthLink}>Login with GitHub</a>
      <div>
      {username && <p>Welcome, {username}!</p>}
    </div>
    </div>
  );
}
