import { useRouter } from "next/router";
import React, { useState } from "react";
import { Card, Modal } from "antd";
import { Clue } from "../pages/api/gameResponse";

interface Props {
  buttonText: string;
  title: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

/** Preview is shown before a game or round starts. */
export default function Preview(props: Props) {
  const [showModal, setShowModal] = useState(true);

  const handleClickOK = () => {
    setShowModal(false);
    if (props.onClick) {
      props.onClick();
    }
  };

  return (
    <Modal
      title={<h2>{props.title}</h2>}
      visible={showModal}
      onOk={handleClickOK}
      cancelButtonProps={{ style: { display: "none" } }}
      closable={false}
      okText={props.buttonText}
    >
      {props.children}
    </Modal>
  );
}

export function SinglePreview(props: {
  year: number;
  month: number;
  day: number;
  onClick: () => void;
}) {
  // Month must be 0-indexed, so subtract 1.
  const date = new Date(props.year, props.month - 1, props.day);
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <Preview onClick={props.onClick} title="Play &rarr;" buttonText="Start">
      <p>Click to play {dateStr}</p>
    </Preview>
  );
}

export function DoublePreview(props: { onClick: () => void }) {
  return (
    <Preview
      onClick={props.onClick}
      title="Play Double &rarr;"
      buttonText="Start"
    >
      <p>Single round done! Click to play double</p>
    </Preview>
  );
}

export function FinalPreview(props: { onClick: () => void }) {
  return (
    <Preview
      onClick={props.onClick}
      title="Play Final &rarr;"
      buttonText="Start"
    >
      <p>Double round done! Click for Final prompt</p>
    </Preview>
  );
}

export function EndPreview(props: { finalClue?: Clue }) {
  const router = useRouter();
  const handleClickHome = () => {
    router.push("/");
  };

  return (
    <Preview title="Game over!" buttonText="Home" onClick={handleClickHome}>
      <p>The final answer was:</p>
      <Card>
        <p>{props.finalClue?.clue}</p>
        <p>
          <strong>{props.finalClue?.answer}</strong>
        </p>
      </Card>
    </Preview>
  );
}
