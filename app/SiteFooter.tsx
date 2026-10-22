import HalftoneWordmarkFooter from '@/components/ui/halftone-wordmark-footer';

// Site-wide footer: the brand question printed in halftone, in deep ink.
export default function SiteFooter() {
  return (
    <HalftoneWordmarkFooter
      wordmark="jump?"
      label="Would You Jump?"
      meta="Private founder matchmaking · super{set} 2026"
      columns={[
        {title: 'Product', links: [{label: 'Join the event', href: '/agent'}, {label: 'Private workspace', href: '/agent'}, {label: 'Your matches', href: '/matches'}]},
        {title: 'Read', links: [{label: '01 The quiet problem', href: '/#problem'}, {label: '02 How it works', href: '/#how'}, {label: '03 Who sees what', href: '/#who'}, {label: '04 Nova × Atlas', href: '/#pairing'}]},
      ]}
      palette={{background: '#0e1621', ink: '#e8eef6', warm: '#7aa2ff'}}
      fontFamily='"Instrument Serif", Georgia, serif'
      fontWeight={400}
      dotGap={5}
      crop={0.18}
      height="460px"
      className="wyj-footer"
    />
  );
}
