import * as dns from "node:dns";

declare global {
  var __mailopsDnsConfigured: boolean | undefined;
}

if (!globalThis.__mailopsDnsConfigured) {
  const dnsProvider =
    process.env.DNS_PROVIDER?.toLowerCase() ?? "system";

  switch (dnsProvider) {
    case "cloudflare":
      dns.setServers(["1.1.1.1", "1.0.0.1"]);
      break;

    case "google":
      dns.setServers(["8.8.8.8", "8.8.4.4"]);
      break;

    case "system":
      // Use the operating system's default DNS servers.
      break;

    default:
      throw new Error(
        `Invalid DNS_PROVIDER: ${dnsProvider}. Use cloudflare, google, or system.`
      );
  }

  globalThis.__mailopsDnsConfigured = true;
}