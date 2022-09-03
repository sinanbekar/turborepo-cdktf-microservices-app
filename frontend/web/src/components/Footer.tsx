const Footer = () => (
  <footer className="mt-auto border-t border-slate-400/10 dark:border-white/10 py-8 bg-slate-50 dark:bg-slate-800">
    <div className="container flex flex-col justify-between items-center gap-y-2">
      <a
        aria-label="Contact Website"
        title="sinan.engineer"
        className="underline"
        href="https://sinan.engineer"
      >
        sinan.engineer
      </a>
      <p className="text-sm text-slate-500 text-center">
        Copyright © 2022 Sinan Bekar. All rights reserved.
      </p>
    </div>
  </footer>
);

export default Footer;
