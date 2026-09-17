export function Footer() {
  // Computed rather than hardcoded so the copyright year never goes stale.
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <p className="footer-trust">Secure checkout powered by Stripe</p>
      <p className="footer-copyright">&copy; {year} Manifesting One Step at a Time, LLC. All rights reserved.</p>
    </footer>
  );
}
