import { CANCEL } from 'redux-saga'

export default function CreateSagaPromise(promise, handler, oncancel) {
  const SagaPromise = new promise(handler)
  SagaPromise[CANCEL] = oncancel
  return SagaPromise
}
