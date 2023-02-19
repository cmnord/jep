import * as React from "react";

export function useMatrix<T>(
  n: number,
  m: number,
  defaultFill: T
): {
  get: (i: number, j: number) => T;
  set: (i: number, j: number, val: T) => void;
  resize: (n: number, m: number, defaultFill: T) => void;
} {
  const [matrix, setMatrix] = React.useState(
    Array.from({ length: n }, () =>
      Array.from({ length: m }, () => defaultFill)
    )
  );

  const set = (i: number, j: number, val: T) => {
    let copy = [...matrix];
    copy[i][j] = val;
    setMatrix(copy);
  };

  const get = (i: number, j: number): T => {
    return matrix[i][j];
  };

  const resize = (newN: number, newM: number, newFill: T) => {
    setMatrix(
      Array.from({ length: newN }, () =>
        Array.from({ length: newM }, () => newFill)
      )
    );
  };

  return { get, set, resize };
}
