import { Link } from "@remix-run/react";
import * as React from "react";

import { QuestionMarkCircle } from "~/components/icons";
import { Anchor } from "~/components/link";
import Modal from "~/components/modal";
import Button from "./button";

const GITHUB_URL = "https://github.com/cmnord/jep";

export default function Header() {
  const [showModal, setShowModal] = React.useState(false);
  return (
    <nav className="p-6 bg-blue-1000">
      <div className="flex justify-between">
        <Link to="/">
          <h1 className="text-2xl font-bold text-white font-korinna text-shadow-md">
            Jep!
          </h1>
        </Link>
        <Modal isOpen={showModal}>
          <Modal.Body>
            <Modal.Title>
              <div className="flex gap-4 items-center">
                {/* Heroicon name: solid/globe-americas */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-8 h-8 text-blue-1000"
                  role="img"
                  aria-labelledby="globe-title"
                >
                  <title id="globe-title">Globe</title>
                  <path
                    fillRule="evenodd"
                    d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM6.262 6.072a8.25 8.25 0 1010.562-.766 4.5 4.5 0 01-1.318 1.357L14.25 7.5l.165.33a.809.809 0 01-1.086 1.085l-.604-.302a1.125 1.125 0 00-1.298.21l-.132.131c-.439.44-.439 1.152 0 1.591l.296.296c.256.257.622.374.98.314l1.17-.195c.323-.054.654.036.905.245l1.33 1.108c.32.267.46.694.358 1.1a8.7 8.7 0 01-2.288 4.04l-.723.724a1.125 1.125 0 01-1.298.21l-.153-.076a1.125 1.125 0 01-.622-1.006v-1.089c0-.298-.119-.585-.33-.796l-1.347-1.347a1.125 1.125 0 01-.21-1.298L9.75 12l-1.64-1.64a6 6 0 01-1.676-3.257l-.172-1.03z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-blue-1000">Jep!</p>
              </div>
            </Modal.Title>
            <div className="mt-4 flex flex-col gap-4">
              <p className="text-gray-500">
                Jep! is a website for playing trivia puzzles with friends
                online.
              </p>
              <hr />
              <p className="text-gray-500">
                This website is open to contributions from developers of any
                level or experience. For more information or to report any
                issues, check out the project on{" "}
                <Anchor href={GITHUB_URL}>GitHub</Anchor>.
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="primary" onClick={() => setShowModal(false)}>
              OK
            </Button>
          </Modal.Footer>
        </Modal>
        <button onClick={() => setShowModal(true)} title="About">
          <QuestionMarkCircle className="w-6 h-6 text-white" />
        </button>
      </div>
    </nav>
  );
}
