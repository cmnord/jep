import { Link } from "@remix-run/react";
import * as React from "react";

import Anchor from "./link";
import Modal from "./modal";

const GITHUB_URL = "https://github.com/cmnord/jep-remix";

export default function Header() {
  const [showModal, setShowModal] = React.useState(false);
  return (
    <nav className="p-6 bg-blue-1000">
      <div className="flex justify-between">
        <Link to="/">
          <h1 className="text-2xl font-bold text-white font-korinna text-shadow-1">
            Jep!
          </h1>
        </Link>
        <Modal
          buttonContent="OK"
          title={
            <div className="flex gap-4 items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8 text-blue-1000"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.115 5.19l.319 1.913A6 6 0 008.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 002.288-4.042 1.087 1.087 0 00-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 01-.98-.314l-.295-.295a1.125 1.125 0 010-1.591l.13-.132a1.125 1.125 0 011.3-.21l.603.302a.809.809 0 001.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 001.528-1.732l.146-.292M6.115 5.19A9 9 0 1017.18 4.64M6.115 5.19A8.965 8.965 0 0112 3c1.929 0 3.716.607 5.18 1.64"
                />
              </svg>
              Jep!
            </div>
          }
          isOpen={showModal}
          onClick={() => setShowModal(false)}
        >
          <div className="mt-4 flex flex-col gap-4">
            <p className="text-gray-500">
              Jep! is a website for playing trivia puzzles with friends online.
            </p>
            <hr />
            <p className="text-gray-500">
              This website is open to contributions from developers of any level
              or experience. For more information or to report any issues, check
              out the project on <Anchor to={GITHUB_URL}>GitHub</Anchor>.
            </p>
          </div>
        </Modal>
        {/* Heroicon name: outline/information-circle */}
        <button onClick={() => setShowModal(true)}>
          <svg
            className="h-6 w-6 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
        </button>
      </div>
    </nav>
  );
}
