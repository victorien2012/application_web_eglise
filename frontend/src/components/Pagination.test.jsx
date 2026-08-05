import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from './Pagination';

describe('Pagination', () => {
  it('ne s affiche pas quand il n y a qu une seule page', () => {
    const { container } = render(<Pagination current={1} total={1} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('affiche toutes les pages quand elles sont peu nombreuses', () => {
    render(<Pagination current={1} total={5} onChange={() => {}} />);
    ['1', '2', '3', '4', '5'].forEach((numero) => {
      expect(screen.getByRole('button', { name: numero })).toBeInTheDocument();
    });
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });

  it('signale la page courante aux lecteurs d ecran', () => {
    render(<Pagination current={3} total={5} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '2' })).not.toHaveAttribute('aria-current');
  });

  it('desactive Precedent sur la premiere page et Suivant sur la derniere', () => {
    const { unmount } = render(<Pagination current={1} total={10} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /page précédente/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /page suivante/i })).toBeEnabled();
    unmount();

    render(<Pagination current={10} total={10} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /page précédente/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /page suivante/i })).toBeDisabled();
  });

  it('condense les pages avec des ellipses sur un gros catalogue', () => {
    // Cas reel de la page Videos : 1523 predications, 12 par page.
    render(<Pagination current={60} total={127} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '127' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '59' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '61' })).toBeInTheDocument();
    expect(screen.getAllByText('…')).toHaveLength(2);
  });

  it('remonte la page demandee au clic sur un numero', async () => {
    const onChange = vi.fn();
    const utilisateur = userEvent.setup();
    // Sur 5 pages, aucune condensation : tous les numeros sont cliquables.
    render(<Pagination current={1} total={5} onChange={onChange} />);

    await utilisateur.click(screen.getByRole('button', { name: '3' }));

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('permet de sauter directement a la derniere page', async () => {
    const onChange = vi.fn();
    const utilisateur = userEvent.setup();
    render(<Pagination current={1} total={127} onChange={onChange} />);

    await utilisateur.click(screen.getByRole('button', { name: '127' }));

    expect(onChange).toHaveBeenCalledWith(127);
  });

  it('remonte la page voisine au clic sur Precedent et Suivant', async () => {
    const onChange = vi.fn();
    const utilisateur = userEvent.setup();
    render(<Pagination current={5} total={10} onChange={onChange} />);

    await utilisateur.click(screen.getByRole('button', { name: /page suivante/i }));
    expect(onChange).toHaveBeenCalledWith(6);

    await utilisateur.click(screen.getByRole('button', { name: /page précédente/i }));
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
