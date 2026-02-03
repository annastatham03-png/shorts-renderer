import { prisma } from "@/lib/prisma";

const statusLabel = {
  draft: "Draft",
  review: "In Review",
  approved: "Approved",
} as const;

export default async function ContentQueuePage() {
  const items = await prisma.contentQueueItem.findMany({
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return (
    <section className="card">
      <h2>Content Queue</h2>
      <p>Draft, review, and approve upcoming videos.</p>
      <table className="table">
        <thead>
          <tr>
            <th>Topic</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.topic}</td>
              <td>
                <span className="badge">{statusLabel[item.status]}</span>
              </td>
              <td>{item.updatedAt.toISOString().split("T")[0]}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={3}>No content queued yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
