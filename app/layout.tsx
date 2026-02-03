// Root layout - minimal wrapper
// The actual HTML structure is in [locale]/layout.tsx for locale-aware pages
// and admin/layout.tsx for admin pages

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
