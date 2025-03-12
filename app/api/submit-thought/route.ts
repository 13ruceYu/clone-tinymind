import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Octokit } from '@octokit/rest';
import { REPO_NAME } from '@/lib/constants';
import { Thought } from '@/lib/types';

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

    const octokit = new Octokit({ auth: token });
    const repo = REPO_NAME;

    // Create a new thought object
    const newThought: Thought = {
      id: Date.now().toString(),
      content,
      date: new Date().toISOString(),
      author: username
    };

    let thoughts: Thought[] = [newThought];
    let sha: string | undefined;

    try {
      // Try to get existing thoughts.json
      const { data } = await octokit.repos.getContent({
        owner: username,
        repo,
        path: 'content/thoughts.json',
      });

      if ('content' in data && 'sha' in data) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        thoughts = JSON.parse(content);
        thoughts.unshift(newThought);
        sha = data.sha;
      }
    } catch (error) {
      // File doesn't exist, will create new one
      await octokit.repos.createOrUpdateFileContents({
        owner: username,
        repo,
        path: 'content/thoughts.json',
        message: 'Create thoughts.json',
        content: Buffer.from(JSON.stringify([newThought], null, 2)).toString('base64'),
      });

      return NextResponse.redirect(new URL('/', request.url));
    }

    // Update existing file
    if (sha) {
      await octokit.repos.createOrUpdateFileContents({
        owner: username,
        repo,
        path: 'content/thoughts.json',
        message: 'Add new thought',
        content: Buffer.from(JSON.stringify(thoughts, null, 2)).toString('base64'),
        sha,
      });
    }

    return NextResponse.redirect(new URL('/', request.url));

  } catch (error) {
    console.error('Error submitting thought:', error);
    return NextResponse.json(
      { error: 'Failed to submit thought' },
      { status: 500 }
    );
  }
}