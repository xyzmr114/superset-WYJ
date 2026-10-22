import HalftoneWordmarkFooter from '@/components/ui/halftone-wordmark-footer';

// Site-wide footer: the brand question printed in halftone dots that part under the pointer.
// "jump?" fills three-quarters of the footer's height and sits fully inside it.
export default function SiteFooter() {
  return (
    <HalftoneWordmarkFooter
      wordmark="jump?"
      label="Would You Jump?"
      meta="A private idea. The right person. Your next chapter."
      columns={[
        {title: 'Build', links: [{label: 'Create a profile', href: '/agent'}, {label: 'Find founders', href: '/matches'}, {label: 'My ideas', href: '/ideas'}]},
        {title: 'Explore', links: [{label: 'Free & Premium', href: '/plans'}, {label: 'Idea studio', href: '/premium'}, {label: 'How it works', href: '/#how'}]},
      ]}
      palette={{background: '#0e1621', ink: '#e8eef6', warm: '#7aa2ff'}}
      fontFamily='"Instrument Serif", Georgia, serif'
      fontWeight={400}
      dotGap={5}
      fill={0.75}
      height="680px"
      className="wyj-footer"
    />
  );
}
