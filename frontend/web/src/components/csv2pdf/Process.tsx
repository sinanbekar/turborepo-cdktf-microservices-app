import React from "react";
import { apiUrl } from "../../util/helpers";

type ServiceResponse = { success: boolean; downloadUrl: string | null };

const Loading = () => (
  <div
    className="md:text-2xl text-lg flex flex-col items-center justify-center gap-6"
    role="status"
  >
    <svg
      aria-hidden="true"
      className="mr-2 md:w-24 md:h-24 w-12 h-12 text-gray-200 animate-spin dark:text-gray-600 fill-sky-500 dark:fill-slate-700"
      viewBox="0 0 100 101"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
        fill="currentColor"
      />
      <path
        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
        fill="currentFill"
      />
    </svg>
    <span>Processing...</span>
  </div>
);

const Process = ({ formData, setIsNewFileAcceptable }: any) => {
  const [response, setResponse] = React.useState<ServiceResponse | null>(null);

  React.useEffect(() => {
    (async () => {
      const res: ServiceResponse = await (
        await fetch(new URL("csv2pdf/process", apiUrl).href, {
          method: "POST",
          body: formData,
        })
      ).json();

      setResponse(res);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return response ? (
    <div className="flex flex-col items-center mt-12">
      <div className="py-12 md:pt-0">
        <button
          onClick={setIsNewFileAcceptable}
          type="button"
          className="border-2 border-black dark:border-white hover:border-4 focus:ring-4 focus:outline-none focus:ring-gray-500 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center"
        >
          <svg
            transform="scale (-1, 1)"
            transform-origin="center"
            aria-hidden="true"
            className="mr-2 -ml-1 w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            ></path>
          </svg>
          Convert another file
        </button>
      </div>

      {response.success ? (
        <div className="flex flex-col gap-6 text-center">
          <h3 className="text-xl">Your file is ready!</h3>
          <a
            href={response.downloadUrl as string}
            className="py-3 px-12 border-2 mx-auto bg-sky-500 dark:bg-slate-700 font-bold text-white rounded-lg"
          >
            Download
          </a>
        </div>
      ) : (
        <div
          className="p-4 mb-4 border border-red-300 dark:border-red-400 rounded-lg bg-red-50 dark:bg-red-500/10"
          role="alert"
        >
          <div className="flex items-center">
            <svg
              aria-hidden="true"
              className="w-5 h-5 mr-2 text-red-900 dark:text-red-400"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              ></path>
            </svg>

            <h3 className="md:text-lg text-sm text-center font-medium text-red-900 dark:text-red-400">
              Sorry, an error has occurred.
            </h3>
          </div>
        </div>
      )}
    </div>
  ) : (
    <Loading />
  );
};

export default Process;
