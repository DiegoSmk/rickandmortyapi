import { buildApp } from "../app";

async function main() {
  const app = buildApp();

  try {
    const result = await app.characterEnrichment.enrichBatch({
      limit: 826,
      onlyMissing: true,
      delayMs: 1200
    });

    app.log.info(
      {
        queued: result.queued,
        processed: result.processed,
        successCount: result.successCount,
        failureCount: result.failureCount
      },
      "Batch enrichment finished"
    );

    if (result.failureCount > 0) {
      const failed = result.results
        .filter((item) => item.status === "failed")
        .slice(0, 20);

      app.log.warn({ failed }, "Some characters failed during batch enrichment");
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
