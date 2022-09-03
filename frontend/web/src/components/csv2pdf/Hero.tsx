import Info from "./Info";
import Upload from "./Upload";

const Hero = ({ isMobile }: any) => (
  <section className="container my-8">
    <div className="flex flex-col justify-center items-center my-4 gap-8">
      <h2 className="text-center text-xl">
        Easily convert CSV to PDF now!
      </h2>
      <Upload isMobile={isMobile} />
    </div>
    <Info />
  </section>
);

export default Hero;
