import { type NextRequest } from "next/server";
import { cookies } from 'next/headers';
import { checkAndInitRepository } from "@/lib/github";

const GITHUB_CLIENT_ID = process.env.GITHUB_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_SECRET!;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    // Initial OAuth request
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: "read:user user:email public_repo workflow", // Added 'repo' scope
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
    const cookieStore = await cookies();

    // Set username cookie
    cookieStore.set('username', userData.login, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Set access token cookie
    cookieStore.set('gh_token', accessToken, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      httpOnly: true, // For security
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    });
    // After setting cookies
    await checkAndInitRepository(userData.login, accessToken);

    // Create response with redirect
    const response = Response.redirect(new URL('/', request.url));
    return response;
  } catch (error) {
    console.log(error)
    return Response.json({ error: "Authentication failed" }, { status: 500 });
  }
}