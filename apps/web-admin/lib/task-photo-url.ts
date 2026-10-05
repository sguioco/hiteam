// Use the session-cookie proxy for both image previews and downloads.
export function taskPhotoUrl(url: string) {
  const match = url.match(/\/api\/v1\/media\/task-photo-proofs\/([^/?#]+)\/file(?:[?#].*)?$/);
  return match ? `/api/task-photo-proofs/${match[1]}` : url;
}
