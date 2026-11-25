export const SNAPSHOT_FILES = [
  ".cache/snapshot-complete.json",
  ".cache/wp-theme.json",
  ".cache/content/posts",
  ".cache/content/shuoshuo",
  ".cache/content/taxonomies.json",
  ".cache/content/media-manifest.json",
];

export function missingSnapshotFiles(exists) {
  return SNAPSHOT_FILES.filter((item) => !exists(item));
}
