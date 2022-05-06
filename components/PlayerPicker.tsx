import React, { KeyboardEvent, useState } from "react";
import { Input, Form } from "antd";
import { MinusCircleOutlined } from "@ant-design/icons";
import styles from "../styles/PlayerPicker.module.css";

export default function PlayerPicker() {
  const [playerNames, setPlayerNames] = useState<string[]>([""]);

  const setPlayerName = (i: number, name: string) => {
    const newPlayerNames = [...playerNames];
    newPlayerNames[i] = name;
    setPlayerNames(newPlayerNames);
  };

  const handleAddPlayer = () => {
    setPlayerNames([...playerNames, ""]);
  };

  const handleAddPlayerKeyboard = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") {
      return;
    }
    handleAddPlayer();
  };

  const handleRemovePlayer = (i: number) => {
    setPlayerNames((pns) => pns.filter((_, idx) => i !== idx));
  };

  const renderPlayer = (name: string, i: number) => (
    <Form.Item label={`Player ${i}`} key={`player-${i}`}>
      <Input
        placeholder="player name"
        type="text"
        autoFocus
        value={name}
        onChange={(e) => setPlayerName(i, e.target.value)}
        onKeyDown={handleAddPlayerKeyboard}
        style={{ width: "70%" }}
      />
      {playerNames.length > 1 ? (
        <MinusCircleOutlined
          className={styles.deleteButton}
          onClick={() => handleRemovePlayer(i)}
        />
      ) : null}
    </Form.Item>
  );

  return <>{playerNames.map(renderPlayer)}</>;
}
