// Directory containing your data files
const dataDir = './data';

const server = Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);
    // Strip the leading slash from the pathname if it exists
    const filePath = `${dataDir}/${url.pathname.replace(/^\/+/, '')}`;

    // Validate the URL path
    const validPathPattern =
      /^(provinces|regencies|districts|villages)\/[^\/]+\.geojson$/;
    if (!validPathPattern.test(url.pathname.replace(/^\/+/, ''))) {
      return Response.json(
        { error: 'Invalid path' },
        {
          status: 400,
        },
      );
    }

    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      return Response.json(
        { error: 'File not found' },
        {
          status: 404,
        },
      );
    }

    return new Response(file);
  },
});

console.log(`Server running at ${server.url}`);
