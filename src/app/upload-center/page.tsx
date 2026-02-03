import { prisma } from "@/lib/prisma";

export default async function UploadCenterPage() {
  const approvedItems = await prisma.contentQueueItem.findMany({
    where: { status: "approved" },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return (
    <section className="card">
      <h2>Upload Center</h2>
      <p>Select an approved item, attach an MP4, and submit for upload.</p>
      <form action="/api/upload" method="post" encType="multipart/form-data">
        <label>
          Approved Item
          <select name="contentItemId" required>
            {approvedItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.topic}
              </option>
            ))}
          </select>
        </label>
        <label>
          MP4 File
          <input type="file" name="file" accept="video/mp4" required />
        </label>
        <label>
          Title
          <input type="text" name="title" required />
        </label>
        <label>
          Description
          <textarea name="description" />
        </label>
        <button type="submit">Upload to YouTube</button>
      </form>
    </section>
  );
}
