/**
 *    Copyright (c) ppy Pty Ltd <contact@ppy.sh>.
 *
 *    This file is part of osu!web. osu!web is distributed with the hope of
 *    attracting more community contributions to the core ecosystem of osu!.
 *
 *    osu!web is free software: you can redistribute it and/or modify
 *    it under the terms of the Affero GNU General Public License version 3
 *    as published by the Free Software Foundation.
 *
 *    osu!web is distributed WITHOUT ANY WARRANTY; without even the implied
 *    warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *    See the GNU Affero General Public License for more details.
 *
 *    You should have received a copy of the GNU Affero General Public License
 *    along with osu!web.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as _ from 'lodash';
import * as React from 'react';
import { activeKeyDidChange, ContainerContext, KeyContext, State as ActiveKeyState } from 'stateful-activation-context';
import { TooltipContext } from 'tooltip-context';
import { UserCard } from 'user-card';

declare global {
  interface HTMLElement {
    _tooltip?: string;
  }

  interface JQuery {
    qtip(...args: any): any;
  }
}

interface PropsInterface {
  container: HTMLElement;
  lookup: string;
}

interface StateInterface extends ActiveKeyState {
  user?: User;
}

const triggerDelay = 200;
const userCardTooltipSelector = '.qtip--user-card';
let inCard = false;
let tooltipWithActiveMenu: any;

function onMouseEnter() {
  inCard = true;
}

function onMouseLeave() {
  inCard = false;
}

function onMouseOver(event: JQueryEventObject) {
  if (tooltipWithActiveMenu != null) { return; }
  if (osu.isMobile()) { return; }

  const el = event.currentTarget as HTMLElement;
  const userId = el.dataset.userId;
  if (userId == null) { return; }
  // don't show cards for blocked users
  if (_.find(currentUser.blocks, { target_id: parseInt(userId, 10)})) { return; }

  if (el._tooltip == null) {
    return createTooltip(el);
  }

  if (el._tooltip !== el.dataset.userId) {
    // wrong userId, destroy current tooltip
    $(el).qtip('api').destroy();
  }
}

function onBeforeCache() {
  inCard = false;
  tooltipWithActiveMenu = null;
}

function handleForceHide(event: JQueryEventObject) {
  if (inCard) { return; }
  if (event.keyCode === 27
    || (event.button === 0 && tooltipWithActiveMenu == null)) {
      $(userCardTooltipSelector).qtip('hide');
  }
}

function createTooltip(element: HTMLElement) {
  const userId = element.dataset.userId;
  element._tooltip = userId;

  // react should override the existing content after mounting
  const card = $('#js-usercard__loading-template').children().clone()[0];
  card.classList.remove('js-react--user-card');
  card.classList.add('js-react--user-card-tooltip');
  delete card.dataset.reactTurbolinksLoaded;
  card.dataset.lookup = userId;

  const options = {
    content: {
      text: card,
    },
    events: {
      render: reactTurbolinks.boot,
      show: shouldShow,
    },
    hide: {
      delay: triggerDelay,
      effect: hideEffect,
      fixed: true,
    },
    position: {
      adjust: { scroll: false },
      at: 'right center',
      my: 'left center',
      viewport: $(window),
    },
    show: {
      delay: triggerDelay,
      effect: showEffect,
      ready: true,
    },
    style: {
      classes: 'qtip--user-card',
      def: false,
      tip: false,
    },
  };

  $(element).qtip(options);
}

function showEffect() {
  $(this).fadeTo(110, 1);
}

function hideEffect() {
  $(this).fadeTo(110, 0);
}
function shouldShow(event: JQueryEventObject) {
  if (tooltipWithActiveMenu != null || osu.isMobile()) {
    event.preventDefault();
  }
}

$(document).on('mouseover', '.js-usercard', onMouseOver);
$(document).on('mousedown keydown', handleForceHide);
$(document).on('mouseenter', '.js-react--user-card-tooltip', onMouseEnter);
$(document).on('mouseleave', '.js-react--user-card-tooltip', onMouseLeave);
$(document).on('turbolinks:before-cache', onBeforeCache);

/**
 * This component's job is to get the data and bootstrap the actual UserCard component for tooltips.
 */
export class UserCardTooltip extends React.PureComponent<PropsInterface, StateInterface> {
  readonly activeKeyDidChange = (key: any) => {
    tooltipWithActiveMenu = key;
    activeKeyDidChange.bind(this)(key);
    if (key == null) {
      $(userCardTooltipSelector).qtip('hide');
    }
  }

  readonly state: StateInterface = {};

  componentDidMount() {
    this.getUser().then((user) => {
      this.setState({ user });
    });
  }

  getUser() {
    const url = laroute.route('users.card', { user: this.props.lookup });

    return $.ajax({
      dataType: 'json',
      type: 'GET',
      url,
    });
  }

  render() {
    const activated = this.state.activeKey === this.props.lookup;

    return (
      <TooltipContext.Provider value={this.props.container}>
        <ContainerContext.Provider value={{ activeKeyDidChange: this.activeKeyDidChange }}>
          <KeyContext.Provider value={this.props.lookup}>
            <UserCard activated={activated} user={this.state.user} />
          </KeyContext.Provider>
        </ContainerContext.Provider>
      </TooltipContext.Provider>
    );
  }
}
