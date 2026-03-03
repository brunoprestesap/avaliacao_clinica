import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Avaliação Clínica Estrutural",
    short_name: "Matriz FASE",
    description:
      "Sistema interno – avaliação clínica e estrutural durante consulta médica.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F3E1",
    theme_color: "#41431B",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
