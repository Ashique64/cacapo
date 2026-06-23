import ContactClient from "./ContactClient";

export const metadata = {
  title: "Contact Us",
  description:
    "Reach out to the House of CACAPO. Get in touch for style consultations, order support, exchange requests, or business inquiries. We respond within 12 hours.",
  alternates: {
    canonical: "https://cacapoclothing.com/contact",
  },
  openGraph: {
    title: "Contact Us | CACAPO",
    description:
      "Get in touch with CACAPO for style consultations, order support, and exchange requests. We respond within 12 hours.",
    url: "https://cacapoclothing.com/contact",
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
