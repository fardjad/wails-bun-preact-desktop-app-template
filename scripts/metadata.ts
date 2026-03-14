import { loadProjectConfig } from "./common";

const config = await loadProjectConfig();
const requestedField = process.argv[2];
const metadata = {
  productName: config.info.productName,
  productIdentifier: config.info.productIdentifier,
  version: config.info.version,
  slug: config.slug,
  vitePort: config.vitePort,
};

if (requestedField) {
  if (!(requestedField in metadata)) {
    throw new Error(`Unknown metadata field ${requestedField}.`);
  }

  console.log(metadata[requestedField as keyof typeof metadata]);
} else {
  console.log(JSON.stringify(metadata, null, 2));
}
