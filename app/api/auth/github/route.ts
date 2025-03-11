import { type NextRequest } from "next/server";
import { cookies } from 'next/headers';

const GITHUB_CLIENT_ID = process.env.GITHUB_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_SECRET!;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    // Initial OAuth request
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: "read:user user:email",
    });

    return Response.redirect(
      `https://github.com/login/oauth/authorize?${params.toString()}`
    );
  }

  try {
    // Exchange code for access token
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await res.json();
    const accessToken = data.access_token;

    // Get user data
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = await userResponse.json();
    (await cookies()).set('username', userData.login, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Create response with redirect and cookie
    const response = Response.redirect(new URL('/', request.url));

    return response;
  } catch (error) {
    console.log(error)
    return Response.json({ error: "Authentication failed" }, { status: 500 });
  }
}