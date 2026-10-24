// External links used by the setup page. Change them here, nowhere else.

// 1) After you upload the APK to a GitHub Release, put your repository name below.
//    Name the uploaded file exactly "creatorlens.apk" so this "latest" link keeps working for every new release.
const GITHUB_USER = 'NartanNaik';
const GITHUB_REPO = 'YOUR_REPO_NAME';

export const APK_URL = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/latest/download/creatorlens.apk`;
export const APK_READY = GITHUB_REPO !== 'YOUR_REPO_NAME';

// 2) Chrome extension that exports your Instagram saved posts (used by the Garbage Eater).
export const EXTENSION_URL =
  'https://chromewebstore.google.com/detail/saved-posts-library-expor/cdhdbhoklknhhggbndhgnekcbadjidkm';