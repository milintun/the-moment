# Uploading

## Purpose

Let people put files into storage themselves, while keeping track of who uploaded each
file, so a file only becomes usable once it has arrived as requested and within a size
limit.

## Principle

Gigi asks to upload a file of type image/png and receives a new upload together with a
link that accepts the file for the next ten minutes. Before Gigi sends anything,
checking the upload against a 10 MB limit is refused because no file has arrived. Gigi
sends a 2 MB PNG through the link, and the same check now succeeds for Gigi but is refused
for Sid, because the upload is not Sid's. Sasha asks to upload
a file of type image/jpeg but sends a 12 MB file; checking it against a 10 MB limit is
refused because it is too large, and the file is removed from storage. Anyone may ask for
a link to Gigi's file, which lets them read it for the next five minutes. When Gigi's file
is no longer needed, removing the upload deletes it from storage, and asking for a link to
it is refused.

## Types

```types
external User
  The person who uploads a file.
```

## State

```state
a set of Uploads with
  an owner User
  a contentType String
  a createdAt DateTime
  Rule: each upload's file is kept in storage under a name derived from the upload
```

## Actions

```actions
requestUpload (owner: User, contentType: String, createdAt: DateTime) : returns (upload: Upload, uploadUrl: String)
  where true
  then
    add a new upload with owner, contentType, and createdAt
    create a link that accepts one file for this upload for ten minutes
    returns upload, uploadUrl

verify (upload: Upload, owner: User, maxSize: Number) : returns ()
  where upload is not in Uploads
  then
    refuses NO_SUCH_UPLOAD "There is no such upload."
  where owner is not the upload's owner
  then
    refuses NOT_YOUR_UPLOAD "This upload belongs to someone else."
  where no file has been stored for upload
  then
    refuses NOT_UPLOADED "The file has not been uploaded yet."
  where the stored file is larger than maxSize bytes or its type differs from the upload's contentType
  then
    remove the stored file
    refuses INVALID_FILE "The file is too large or not of the requested type."
  where owner owns upload and a file of at most maxSize bytes and of the upload's contentType is stored
  then
    returns

remove (upload: Upload) : returns ()
  where upload is not in Uploads
  then
    refuses NO_SUCH_UPLOAD "There is no such upload."
  where upload is in Uploads
  then
    remove upload and any file stored for it
    returns

link (upload: Upload) : returns (url: String)
  where upload is not in Uploads
  then
    refuses NO_SUCH_UPLOAD "There is no such upload."
  where upload is in Uploads
  then
    create a link that lets anyone read upload's file for five minutes
    returns url
```

## Queries

```queries
_get (upload: Upload) : optional (owner: User, contentType: String, createdAt: DateTime)
  answers who uploaded upload, its requested type, and when, and no row when upload is not in Uploads
```
