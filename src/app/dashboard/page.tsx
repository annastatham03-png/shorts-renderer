import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const channel = await prisma.channel.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const snapshots = channel
    ? await prisma.dailySnapshot.findMany({
        where: { channelId: channel.id },
        orderBy: { snapshotDate: "desc" },
        take: 7,
      })
    : [];

  if (!channel) {
    return (
      <section className="card">
        <h2>No channel connected</h2>
        <p>Connect your Google account to sync YouTube analytics.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>{channel.title}</h2>
      <div className="card-grid">
        <div className="card">
          <h3>Subscribers</h3>
          <p>{channel.subscriberCount.toLocaleString()}</p>
        </div>
        <div className="card">
          <h3>Total Views</h3>
          <p>{channel.viewCount.toLocaleString()}</p>
        </div>
        <div className="card">
          <h3>Last Uploads</h3>
          <ul>
            {(channel.lastUploads as Array<{ title: string }> | null)?.map(
              (upload) => (
                <li key={upload.title}>{upload.title}</li>
              ),
            ) || <li>No uploads yet</li>}
          </ul>
        </div>
      </div>

      <h3>Daily snapshots</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Subscribers</th>
            <th>Views</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => (
            <tr key={snapshot.id}>
              <td>{snapshot.snapshotDate.toISOString().split("T")[0]}</td>
              <td>{snapshot.subscriberCount.toLocaleString()}</td>
              <td>{snapshot.viewCount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
