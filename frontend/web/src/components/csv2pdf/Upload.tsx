import React from "react";
import Process from "./Process";
import { useDropzone, FileWithPath } from "react-dropzone";

const Upload = ({ isMobile }: { isMobile: boolean }) => {
  const [formData, setFormData] = React.useState<any>(null);

  const onDrop = React.useCallback(async (acceptedFiles: FileWithPath[]) => {
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append("file", file);
    setFormData(formData);
  }, []);

  const isNewFileAcceptable = !Boolean(formData);
  const setIsNewFileAcceptable = () => setFormData(null);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
    noClick: true,
    noKeyboard: true,
    noDrag: isMobile || !isNewFileAcceptable,
  });

  return (
    <div
      {...getRootProps({
        className: `relative px-8 py-4 md:px-48 md:py-24
        ${
          !isMobile &&
          isNewFileAcceptable &&
          `border-4 border-dashed transition duration-300 ${
            !isDragActive
              ? "border-sky-500 dark:border-slate-700"
              : "bg-sky-500 dark:bg-slate-700"
          }`
        }
        `,
      })}
    >
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="absolute left-0 top-0 right-0 bottom-0 flex justify-center min-h-full items-center">
          <span className="text-white text-2xl font-light">
            Drop the file.
          </span>
        </div>
      )}

      {!isNewFileAcceptable && (
        <div className="absolute top-0 left-0 bottom-0 right-0 flex justify-center min-h-full items-center">
          <Process
            formData={formData}
            setIsNewFileAcceptable={setIsNewFileAcceptable}
          />
        </div>
      )}

      <div
        className={
          isDragActive || !isNewFileAcceptable
            ? "invisible opacity-0 transition-none"
            : "opacity-100 transition duration-500"
        }
      >
        <div className={`text-center ${isMobile && "hidden"}`}>
          <span className="block">Drag &#38; Drop a file here</span>
          <span className="block my-4 font-light">or</span>
        </div>

        <button
          onClick={open}
          className={`py-3 px-12 border-2 mx-auto 
          bg-sky-500 hover:opacity-80 text-white
          focus:ring-4 focus:outline-none focus:ring-sky-400 font-medium rounded-xl text-center inline-flex items-center
          dark:bg-slate-700 dark:focus:ring-slate-500
         ${isDragActive && "invisible"}`}
        >
          Choose a file
        </button>
      </div>
    </div>
  );
};

export default Upload;
