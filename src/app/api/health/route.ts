export async function GET() {
  try {
    return Response.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
