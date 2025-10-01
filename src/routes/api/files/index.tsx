import { Get, Post, Delete, Router } from "@fartlabs/rtx";
import { getFile, getFileMetadata, deleteFile, uploadFile } from "#/lib/file-manager.ts";

export function FileApiRoutes() {
  return (
    <Router>
      {/* Get file by filename */}
      <Get
        pattern="/api/files/:filename"
        handler={async (ctx) => {
          const filename = ctx.params?.pathname.groups.filename;
          if (!filename) {
            return new Response("Filename required", { status: 400 });
          }

          const fileData = await getFile(filename);
          if (!fileData) {
            return new Response("File not found", { status: 404 });
          }

          const metadata = await getFileMetadata(filename);
          const contentType = metadata?.contentType || "application/octet-stream";

          return new Response(fileData, {
            headers: {
              "Content-Type": contentType,
              "Content-Disposition": `inline; filename="${metadata?.originalName || filename}"`,
            },
          });
        }}
      />

      {/* Upload file */}
      <Post
        pattern="/api/files/upload"
        handler={async (ctx) => {
          try {
            const formData = await ctx.request.formData();
            const file = formData.get("file") as File;
            const formId = formData.get("formId") as string;
            const previewType = (formData.get("previewType") as string) || "image";

            if (!file || !formId) {
              return new Response("File and formId are required", { status: 400 });
            }

            // Validate file type
            const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
            const allowedPdfTypes = ["application/pdf"];
            const allowedTypes = [...allowedImageTypes, ...allowedPdfTypes];

            if (!allowedTypes.includes(file.type)) {
              return new Response("Invalid file type. Only images and PDFs are allowed.", { status: 400 });
            }

            // Validate file size (max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
              return new Response("File too large. Maximum size is 10MB.", { status: 400 });
            }

            const metadata = await uploadFile(formId, file, previewType as 'image' | 'pdf');

            return new Response(JSON.stringify({
              success: true,
              metadata: {
                ...metadata,
                url: `/api/files/${metadata.filename}`
              }
            }), {
              headers: { "Content-Type": "application/json" },
            });
          } catch (error) {
            console.error("Upload error:", error);
            return new Response("Upload failed", { status: 500 });
          }
        }}
      />

      {/* Delete file */}
      <Delete
        pattern="/api/files/:filename"
        handler={async (ctx) => {
          const filename = ctx.params?.pathname.groups.filename;
          if (!filename) {
            return new Response("Filename required", { status: 400 });
          }

          const success = await deleteFile(filename);
          if (!success) {
            return new Response("File not found or could not be deleted", { status: 404 });
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }}
      />
    </Router>
  );
}