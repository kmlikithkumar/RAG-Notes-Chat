import { render } from '@testing-library/react';
import App from './App';

it('renders main application container without crashing', () => {
  const { container } = render(<App />);
  expect(container).toBeTruthy();
});
