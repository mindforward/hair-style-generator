// Vercel Serverless Function — returns deployment version info
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  const commit = process.env.VERCEL_GIT_COMMIT_SHA || 'dev';
  const deployedAt = process.env.VERCEL_DEPLOYMENT_CREATED_AT
    ? new Date(process.env.VERCEL_DEPLOYMENT_CREATED_AT).toISOString()
    : new Date().toISOString();
  const url = process.env.VERCEL_URL || 'localhost';

  res.status(200).json({
    commit: commit.slice(0, 7),
    deployedAt,
    url,
  });
}
