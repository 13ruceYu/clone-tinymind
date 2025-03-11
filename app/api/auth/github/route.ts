import { NextRequest } from "next/server";

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
    const response = await fetch("https://github.com/login/oauth/access_token", {
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

    const data = await response.json();
    const accessToken = data.access_token;

    // Get user data
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = await userResponse.json();

    // Here you can:
    // 1. Create or update user in your database
    // 2. Set session/cookies
    // 3. Redirect to your frontend with user data

    return Response.json({ success: true, user: userData });
  } catch (error) {
    return Response.json({ error: "Authentication failed" }, { status: 500 });
  }
}