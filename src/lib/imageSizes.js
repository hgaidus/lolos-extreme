// The widths the photo route will generate, kept in their own module with no
// imports.
//
// This constant is needed on both sides: server code that resizes, and client
// components that build the ?w= URLs. It cannot live in imageResize.js —
// importing that from a "use client" component drags sharp (and its
// child_process dependency) into the browser bundle, which fails the build.
export const ALLOWED_WIDTHS = [400, 800, 1600];
