import { useReducer, useCallback } from "react";

const initialState = {
  step: 1,
  maxStep: 1,
  factorTotal: 0,
  orderData: {
    cartItems: [],
    datetime: {
      delivery: { date: null, time: null },
      pickup: { date: null, time: null },
    },
    location: null,
    discountCode: "",
    discountAmount: 0,
  },
};

function reducer(state, action) {
  switch (action.type) {
    case "STEP_SET":
      return { ...state, step: action.payload };

    case "STEP_MAX_SET":
      return { ...state, maxStep: Math.max(state.maxStep, action.payload) };

    case "FACTOR_TOTAL_SET":
      return { ...state, factorTotal: action.payload };

    case "DATETIME_SET":
      return {
        ...state,
        orderData: {
          ...state.orderData,
          datetime: action.payload,
        },
      };

    case "LOCATION_SET":
      return {
        ...state,
        orderData: {
          ...state.orderData,
          location: action.payload,
        },
      };

    case "DISCOUNT_SET":
      return {
        ...state,
        orderData: {
          ...state.orderData,
          discountCode: action.code,
          discountAmount: action.amount,
        },
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

export function useOrderState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setStep = useCallback((step) => {
    dispatch({ type: "STEP_SET", payload: step });
    dispatch({ type: "STEP_MAX_SET", payload: step });
  }, []);

  const setDateTime = useCallback((datetime) => {
    dispatch({ type: "DATETIME_SET", payload: datetime });
  }, []);

  return {
    state,
    dispatch,
    setStep,
    setDateTime,
  };
}
