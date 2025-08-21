
import { html, render } from 'lit-html';
import { icp_collateral_backend } from 'declarations/icp_collateral_backend';
import { usdc_token } from 'declarations/usdc_token';
import { weth_token } from 'declarations/weth_token';
import { wbtc_token } from 'declarations/wbtc_token';
import { AuthClient } from '@dfinity/auth-client';
import logo from './logo2.svg';

class App {
  state = {
    tab: 'dashboard',
    result: '',
    eventLogs: [],
    loading: false,
    identity: null,
    principal: '',
    faucetResult: '',
    balances: { usdc: null, weth: null, wbtc: null },
  };

  constructor() {
    this.#render();
    this.#fetchEventLogs();
    this.#checkIdentity();
  }

  #checkIdentity = async () => {
    const authClient = await AuthClient.create();
    if (await authClient.isAuthenticated()) {
      const identity = authClient.getIdentity();
      this.state.identity = identity;
      this.state.principal = identity.getPrincipal().toText();
      this.#render();
      this.#fetchBalances();
    }
  };

  #login = async () => {
    const authClient = await AuthClient.create();
    await authClient.login({
      identityProvider: 'https://identity.ic0.app',
      onSuccess: async () => {
        this.state.identity = authClient.getIdentity();
        this.state.principal = this.state.identity.getPrincipal().toText();
        this.#render();
        this.#fetchBalances();
      },
    });
  };

  #fetchBalances = async () => {
    if (!this.state.principal) return;
    try {
      const usdc = await usdc_token.balance_of(this.state.principal);
      const weth = await weth_token.balance_of(this.state.principal);
      const wbtc = await wbtc_token.balance_of(this.state.principal);
      this.state.balances = { usdc, weth, wbtc };
      this.#render();
    } catch (e) {
      this.state.balances = { usdc: null, weth: null, wbtc: null };
      this.#render();
    }
  };

  #handleFaucet = async (token) => {
    this.state.faucetResult = 'Processing...';
    this.#render();
    let res = '';
    try {
      if (token === 'usdc') res = await usdc_token.faucet();
      if (token === 'weth') res = await weth_token.faucet();
      if (token === 'wbtc') res = await wbtc_token.faucet();
      this.state.faucetResult = JSON.stringify(res);
      await this.#fetchBalances();
    } catch (e) {
      this.state.faucetResult = 'Error: ' + e.message;
    }
    this.#render();
  };

  #setTab = (tab) => {
    this.state.tab = tab;
    this.state.result = '';
    this.#render();
    if (tab === 'eventlog') this.#fetchEventLogs();
  };

  #setResult = (result) => {
    this.state.result = result;
    this.#render();
  };

  #fetchEventLogs = async () => {
    this.state.loading = true;
    this.#render();
    try {
      const logs = await icp_collateral_backend.get_event_logs();
      this.state.eventLogs = logs;
    } catch (e) {
      this.state.eventLogs = [{ event_type: 'Error', details: e.message }];
    }
    this.state.loading = false;
    this.#render();
  };

  #handleSupply = async (e) => {
    e.preventDefault();
    const amount = Number(e.target.usdc_amount.value);
    const res = await icp_collateral_backend.supply_liquidity({ USDC: null }, amount);
    this.#setResult(JSON.stringify(res));
    this.#fetchEventLogs();
  };

  #handleDeposit = async (e) => {
    e.preventDefault();
    const token = e.target.token.value;
    const amount = Number(e.target.amount.value);
    const res = await icp_collateral_backend.deposit_collateral({ [token]: null }, amount);
    this.#setResult(JSON.stringify(res));
    this.#fetchEventLogs();
  };

  #handleBorrow = async (e) => {
    e.preventDefault();
    const amount = Number(e.target.borrow_amount.value);
    const res = await icp_collateral_backend.borrow({ USDC: null }, amount);
    this.#setResult(JSON.stringify(res));
    this.#fetchEventLogs();
  };

  #handleRepay = async (e) => {
    e.preventDefault();
    const amount = Number(e.target.repay_amount.value);
    const res = await icp_collateral_backend.repay({ USDC: null }, amount);
    this.#setResult(JSON.stringify(res));
    this.#fetchEventLogs();
  };

  #handleLock = async (e) => {
    e.preventDefault();
    const token = e.target.lock_token.value;
    const amount = Number(e.target.lock_amount.value);
    const days = Number(e.target.lock_days.value);
    const res = await icp_collateral_backend.lock_tokens({ [token]: null }, amount, days);
    this.#setResult(JSON.stringify(res));
    this.#fetchEventLogs();
  };

  #handleWithdraw = async (e) => {
    e.preventDefault();
    const token = e.target.withdraw_token.value;
    const amount = Number(e.target.withdraw_amount.value);
    const res = await icp_collateral_backend.withdraw_collateral({ [token]: null }, amount);
    this.#setResult(JSON.stringify(res));
    this.#fetchEventLogs();
  };

  #handleAdmin = async (e) => {
    e.preventDefault();
    const action = e.target.admin_action.value;
    let res = '';
    if (action === 'pause') res = await icp_collateral_backend.pause_contract();
    if (action === 'unpause') res = await icp_collateral_backend.unpause_contract();
    this.#setResult(JSON.stringify(res));
    this.#fetchEventLogs();
  };

  #render() {
    const { tab, result, eventLogs, loading } = this.state;
    let body = html`
      <main class="defi-main">
        <header class="defi-header">
          <img src="${logo}" alt="Collateral Protocol" class="defi-logo" />
          <h1>ICP Collateral Protocol</h1>
          <nav class="defi-nav">
            <button @click=${() => this.#setTab('dashboard')} class=${tab === 'dashboard' ? 'active' : ''}>Dashboard</button>
            <button @click=${() => this.#setTab('faucet')} class=${tab === 'faucet' ? 'active' : ''}>Faucet</button>
            <button @click=${() => this.#setTab('supply')} class=${tab === 'supply' ? 'active' : ''}>Supply</button>
            <button @click=${() => this.#setTab('deposit')} class=${tab === 'deposit' ? 'active' : ''}>Deposit</button>
            <button @click=${() => this.#setTab('borrow')} class=${tab === 'borrow' ? 'active' : ''}>Borrow</button>
            <button @click=${() => this.#setTab('repay')} class=${tab === 'repay' ? 'active' : ''}>Repay</button>
            <button @click=${() => this.#setTab('withdraw')} class=${tab === 'withdraw' ? 'active' : ''}>Withdraw</button>
            <button @click=${() => this.#setTab('lock')} class=${tab === 'lock' ? 'active' : ''}>Lock</button>
            <button @click=${() => this.#setTab('eventlog')} class=${tab === 'eventlog' ? 'active' : ''}>Event Log</button>
            <button @click=${() => this.#setTab('admin')} class=${tab === 'admin' ? 'active' : ''}>Admin</button>
          </nav>
        </header>
        <section class="defi-content">
          ${tab === 'dashboard' ? html`
            <div class="defi-welcome">
              <h2>Welcome to ICP Collateral Protocol</h2>
              <p>DeFi lending, borrowing, and collateral management on Internet Computer. All actions are logged and can be analyzed. Ready for Fetch.ai/UAgent integration.</p>
              <div style="margin-top:2rem;">
                ${this.state.identity ? html`
                  <div>Logged in as: <b>${this.state.principal}</b></div>
                ` : html`
                  <button class="defi-form" @click=${this.#login}>Login with Internet Identity</button>
                `}
              </div>
            </div>
          ` : ''}
          ${tab === 'faucet' ? html`
            <div class="defi-faucet">
              <h2>Token Faucet</h2>
              ${this.state.identity ? html`
                <div>Principal: <b>${this.state.principal}</b></div>
                <div style="margin:1rem 0;">
                  <button @click=${() => this.#handleFaucet('usdc')}>Claim USDC</button>
                  <button @click=${() => this.#handleFaucet('weth')}>Claim WETH</button>
                  <button @click=${() => this.#handleFaucet('wbtc')}>Claim WBTC</button>
                </div>
                <div>Balances:</div>
                <ul>
                  <li>USDC: ${this.state.balances.usdc}</li>
                  <li>WETH: ${this.state.balances.weth}</li>
                  <li>WBTC: ${this.state.balances.wbtc}</li>
                </ul>
                <div class="defi-result">${this.state.faucetResult}</div>
              ` : html`
                <button class="defi-form" @click=${this.#login}>Login with Internet Identity to claim faucet</button>
              `}
            </div>
          ` : ''}
          ${tab === 'supply' ? html`
            <form class="defi-form" @submit=${this.#handleSupply}>
              <h2>Supply USDC</h2>
              <input type="number" name="usdc_amount" placeholder="Amount (USDC)" required min="1" />
              <button type="submit">Supply</button>
            </form>
          ` : ''}
          ${tab === 'deposit' ? html`
            <form class="defi-form" @submit=${this.#handleDeposit}>
              <h2>Deposit Collateral</h2>
              <select name="token">
                <option value="WETH">WETH</option>
                <option value="WBTC">WBTC</option>
              </select>
              <input type="number" name="amount" placeholder="Amount" required min="1" />
              <button type="submit">Deposit</button>
            </form>
          ` : ''}
          ${tab === 'borrow' ? html`
            <form class="defi-form" @submit=${this.#handleBorrow}>
              <h2>Borrow USDC</h2>
              <input type="number" name="borrow_amount" placeholder="Amount (USDC)" required min="1" />
              <button type="submit">Borrow</button>
            </form>
          ` : ''}
          ${tab === 'repay' ? html`
            <form class="defi-form" @submit=${this.#handleRepay}>
              <h2>Repay USDC</h2>
              <input type="number" name="repay_amount" placeholder="Amount (USDC)" required min="1" />
              <button type="submit">Repay</button>
            </form>
          ` : ''}
          ${tab === 'withdraw' ? html`
            <form class="defi-form" @submit=${this.#handleWithdraw}>
              <h2>Withdraw Collateral</h2>
              <select name="withdraw_token">
                <option value="WETH">WETH</option>
                <option value="WBTC">WBTC</option>
              </select>
              <input type="number" name="withdraw_amount" placeholder="Amount" required min="1" />
              <button type="submit">Withdraw</button>
            </form>
          ` : ''}
          ${tab === 'lock' ? html`
            <form class="defi-form" @submit=${this.#handleLock}>
              <h2>Lock Tokens</h2>
              <select name="lock_token">
                <option value="WETH">WETH</option>
                <option value="WBTC">WBTC</option>
              </select>
              <input type="number" name="lock_amount" placeholder="Amount" required min="1" />
              <input type="number" name="lock_days" placeholder="Days" required min="1" />
              <button type="submit">Lock</button>
            </form>
          ` : ''}
          ${tab === 'eventlog' ? html`
            <div class="defi-eventlog">
              <h2>Event Log</h2>
              ${loading ? html`<p>Loading...</p>` : ''}
              <ul>
                ${eventLogs.length === 0 ? html`<li>No events yet.</li>` : eventLogs.map(ev => html`<li><b>${ev.event_type}</b>: ${ev.details}</li>`)}
              </ul>
            </div>
          ` : ''}
          ${tab === 'admin' ? html`
            <form class="defi-form" @submit=${this.#handleAdmin}>
              <h2>Admin Controls</h2>
              <select name="admin_action">
                <option value="pause">Pause Contract</option>
                <option value="unpause">Unpause Contract</option>
              </select>
              <button type="submit">Execute</button>
            </form>
          ` : ''}
          <div class="defi-result">${result}</div>
        </section>
        <footer class="defi-footer">
          <p>ICP Collateral Protocol &mdash; DeFi for Internet Computer. Ready for Fetch.ai/UAgent integration.</p>
        </footer>
      </main>
    
    `;
    render(body, document.getElementById('root'));
  }
}

export default App;
