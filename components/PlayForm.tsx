import React, { useState, FormEvent } from "react";
import { Button, Card, Form, DatePicker } from "antd";
import moment from "moment";
import { useRouter } from "next/router";
import PlayerPicker from "./PlayerPicker";

export default function PlayForm() {
  const [date, setDate] = useState<moment.Moment | null>(moment());
  const router = useRouter();

  const handleChangeDate = (newDate: moment.Moment | null) => {
    setDate(newDate);
  };

  const handleSubmit = () => {
    if (!date) {
      return;
    }
    router.push({
      pathname: "/game",
      query: {
        // Month is 0-indexed, so add 1.
        month: date.month() + 1,
        day: date.date(),
        year: date.year(),
      },
    });
  };

  const handleSubmitForm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <Card title="New Game">
      <Form
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        onFinish={handleSubmitForm}
      >
        <Form.Item label="Game Date">
          <DatePicker value={date} onChange={handleChangeDate} />
        </Form.Item>
        <PlayerPicker />
        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          {date !== null ? (
            <Button type="primary" onClick={handleSubmit}>
              Play this game
            </Button>
          ) : null}
        </Form.Item>
      </Form>
    </Card>
  );
}
