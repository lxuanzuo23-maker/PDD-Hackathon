export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "tinywins",
    time: new Date().toISOString(),
  });
}
