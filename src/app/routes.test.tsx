import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from '@/test/render';

describe('public routes', () => {
  it('home shows both calls to action and the main navigation', async () => {
    renderRoute('/');
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    const hero = screen.getByRole('heading', { level: 1 }).closest('section')!;
    expect(within(hero).getByRole('link', { name: 'Request a Custom Order' })).toHaveAttribute('href', '/custom-order');
    expect(within(hero).getByRole('link', { name: 'Shop Available Products' })).toHaveAttribute('href', '/shop');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Our Work' })).toBeInTheDocument();
  });

  it('project pages link to the custom-order form with the project attached', async () => {
    renderRoute('/work/walnut-dining-table');
    const link = await screen.findByRole('link', { name: 'Request Something Similar' });
    expect(link).toHaveAttribute('href', '/custom-order?project=walnut-dining-table');
    expect(screen.getByText(/example of past work, not an item in stock/i)).toBeInTheDocument();
  });

  it('out-of-stock products cannot be requested', async () => {
    renderRoute('/shop/ash-step-stool');
    expect(await screen.findByText('This item is currently out of stock.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request This Item' })).not.toBeInTheDocument();
  });

  it('shows an honest not-connected notice instead of a fake order confirmation', async () => {
    renderRoute('/shop/oak-side-table');
    await userEvent.click(await screen.findByRole('button', { name: 'Request This Item' }));
    expect(await screen.findByText('Not connected yet')).toBeInTheDocument();
    expect(screen.queryByText('Request sent')).not.toBeInTheDocument();
  });

  it('custom-order form validates and keeps entered data when submission is unavailable', async () => {
    const user = userEvent.setup();
    renderRoute('/custom-order');
    await user.click(await screen.findByRole('button', { name: 'Send Request' }));
    expect(await screen.findByText('Please check the highlighted fields')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Full name/), 'Sam Carter');
    await user.type(screen.getByLabelText(/^Email/), 'sam@example.com');
    await user.type(screen.getByLabelText(/Phone number/), '+1 555 010 0000');
    await user.selectOptions(screen.getByLabelText(/Product category/), 'tables');
    await user.type(screen.getByLabelText(/Project description/), 'A round dining table for six people.');
    await user.selectOptions(screen.getByLabelText(/Preferred material/), 'need-advice');
    await user.selectOptions(screen.getByLabelText(/Preferred finish/), 'need-advice');
    await user.type(screen.getByLabelText(/Delivery location/), 'City centre');
    await user.click(screen.getByLabelText(/I understand that submitting/));
    await user.click(screen.getByRole('button', { name: 'Send Request' }));

    expect(await screen.findByText('Not connected yet')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/)).toHaveValue('Sam Carter');
  });

  it('prefills the reference project from the URL', async () => {
    renderRoute('/custom-order?project=oak-alcove-shelving');
    expect(await screen.findByRole('link', { name: 'Oak alcove shelving' })).toBeInTheDocument();
  });

  it('unknown paths show the not-found page', async () => {
    renderRoute('/nope');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
