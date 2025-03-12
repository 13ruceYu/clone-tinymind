import { Octokit } from '@octokit/rest';
import { REPO_NAME } from './constants';

export async function checkAndInitRepository(username: string, token: string) {
  const octokit = new Octokit({ auth: token });

  try {
    await octokit.repos.get({
      owner: username,
      repo: REPO_NAME,
    });
  } catch (error) {
    await octokit.repos.createUsingTemplate({
      template_owner: '13ruceYu',
      template_repo: 'tinymind-template',
      owner: username,
      name: REPO_NAME,
      description: 'My thoughts repository',
      private: false, // or true if you want private repos
    });
  }
}