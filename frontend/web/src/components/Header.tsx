const Header = () => (
  <header className="md:py-6 py-3 dark:bg-slate-800">
    <div className="container flex md:justify-around justify-center items-center">
      <a
        aria-label="Logo"
        role="banner"
        title="Microservices App"
        className="md:text-xl text-lg font-semibold"
        href="/"
      >
        Microservices App
      </a>
      <div className="hidden md:block">
        <ul className="flex gap-8">
          <li>
            <a className="dark:text-slate-200" role="link" href="/">
              CSV to PDF Converter
            </a>
          </li>
          <li className="text-slate-500 opacity-40">Merge PDF</li>
          <li className="text-slate-500 opacity-40">Split PDF</li>
        </ul>
      </div>
      <div>
        <a
          className="hidden md:block text-slate-500 opacity-40 pointer-events-none"
          href="/"
        >
          Developer API
        </a>
      </div>
    </div>
  </header>
);

export default Header;
