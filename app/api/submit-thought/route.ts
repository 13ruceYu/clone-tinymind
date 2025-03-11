import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('username')?.value;
    const token = cookieStore.get('gh_token')?.value;

    if (!username || !token) {
      return NextResponse.json(
        { error: 'You must be logged in to submit thoughts' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const content = formData.get('content') as string;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Create a new thought object
    const newThought = {
      id: Date.now().toString(),
      content,
      date: new Date().toISOString(),
      author: username
    };

    // Check if repository exists first
    const repoResponse = await fetch(
      `https://api.github.com/repos/${username}/tinymind-blog`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!repoResponse.ok) {
      // Create repository if it doesn't exist
      await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'tinymind-blog',
          description: 'My thoughts repository',
          auto_init: true
        })
      });
    }

    // Get the current thoughts.json file from GitHub
    const thoughtsResponse = await fetch(
      `https://api.github.com/repos/${username}/tinymind-blog/contents/content/thoughts.json`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!thoughtsResponse.ok) {
      // If file doesn't exist, create it
      if (thoughtsResponse.status === 404) {
        await createNewThoughtsFile(username, [newThought]);
        return NextResponse.redirect(new URL('/', request.url));
      }

      throw new Error(`Failed to fetch thoughts.json: ${thoughtsResponse.statusText}`);
    }

    const thoughtsData = await thoughtsResponse.json();
    const content64 = thoughtsData.content;
    const sha = thoughtsData.sha;

    // Decode the base64 content
    const decodedContent = Buffer.from(content64, 'base64').toString('utf-8');
    let thoughts = JSON.parse(decodedContent);

    // Add the new thought
    thoughts.unshift(newThought);

    // Update the file on GitHub
    const updateResponse = await fetch(
      `https://api.github.com/repos/${username}/tinymind-blog/contents/content/thoughts.json`,
      {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Add new thought',
          content: Buffer.from(JSON.stringify(thoughts, null, 2)).toString('base64'),
          sha
        })
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('GitHub API Error:', errorData);
      throw new Error(`Failed to update thoughts.json: ${updateResponse.statusText}`);
    }

    // Redirect back to the homepage
    return NextResponse.redirect(new URL('/', request.url));

  } catch (error) {
    console.error('Error submitting thought:', error);
    return NextResponse.json(
      { error: 'Failed to submit thought' },
      { status: 500 }
    );
  }
}

async function createNewThoughtsFile(username: string, thoughts: any[]) {
  const token = (await cookies()).get('gh_token')?.value;

  const response = await fetch(
    `https://api.github.com/repos/${username}/tinymind-blog/contents/content/thoughts.json`,
    {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Create thoughts.json',
        content: Buffer.from(JSON.stringify(thoughts, null, 2)).toString('base64')
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create thoughts.json: ${response.statusText}`);
  }

  return response.json();
}