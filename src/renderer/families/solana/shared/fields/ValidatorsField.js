// @flow
import { getAccountUnit } from "@ledgerhq/live-common/lib/account";
import { formatCurrencyUnit } from "@ledgerhq/live-common/lib/currencies";
import { getAddressExplorer, getDefaultExplorerView } from "@ledgerhq/live-common/lib/explorers";
import { useLedgerFirstShuffledValidators } from "@ledgerhq/live-common/lib/families/solana/react";
import type { ValidatorAppValidator } from "@ledgerhq/live-common/lib/families/solana/validator-app";
import type { Account, TransactionStatus } from "@ledgerhq/live-common/lib/types";
import { BigNumber } from "bignumber.js";
import invariant from "invariant";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TFunction } from "react-i18next";
import { Trans } from "react-i18next";
import Box from "~/renderer/components/Box";
import ValidatorRow, { IconContainer } from "~/renderer/components/Delegation/ValidatorRow";
import ValidatorSearchInput, {
  NoResultPlaceholder,
} from "~/renderer/components/Delegation/ValidatorSearchInput";
import FirstLetterIcon from "~/renderer/components/FirstLetterIcon";
import Image from "~/renderer/components/Image";
import ScrollLoadingList from "~/renderer/components/ScrollLoadingList";
import Text from "~/renderer/components/Text";
import { openURL } from "~/renderer/linking";

type Props = {
  t: TFunction,
  account: Account,
  status: TransactionStatus,
  chosenVoteAccAddr: ?string,
  onChangeValidator: (v: ValidatorAppValidator) => void,
};

const ValidatorField = ({ t, account, onChangeValidator, chosenVoteAccAddr, status }: Props) => {
  if (!status) return null;

  invariant(account && account.solanaResources, "solana account and resources required");

  const { solanaResources } = account;

  const [search, setSearch] = useState("");

  const unit = getAccountUnit(account);

  const validators = useLedgerFirstShuffledValidators(account.currency);

  const validatorsFiltered = useMemo(() => {
    return validators.filter(validator => {
      return (
        validator.name?.toLowerCase().includes(search) ||
        validator.voteAccount.toLowerCase().includes(search)
      );
    });
  }, [validators, search]);

  const containerRef = useRef();

  const explorerView = getDefaultExplorerView(account.currency);

  const onExternalLink = useCallback(
    (address: string) => {
      const validator = validators.find(v => v.voteAccount === address);

      const url =
        (validator && validator.wwwUrl) ||
        (explorerView && getAddressExplorer(explorerView, address));

      if (url) {
        openURL(url);
      }
    },
    [explorerView],
  );

  const onSearch = (event: SyntheticInputEvent<HTMLInputElement>) => setSearch(event.target.value);

  /** auto focus first input on mount */
  useEffect(() => {
    /** $FlowFixMe */
    if (containerRef && containerRef.current && containerRef.current.querySelector) {
      const firstInput = containerRef.current.querySelector("input");
      if (firstInput && firstInput.focus) firstInput.focus();
    }
  }, []);

  const renderItem = (validator: ValidatorAppValidator) => {
    return (
      <ValidatorRow
        // HACK: if value > 0 then row is shown as active
        value={chosenVoteAccAddr === validator.voteAccount ? 1 : 0}
        onClick={onChangeValidator}
        key={validator.voteAccount}
        validator={{ address: validator.voteAccount }}
        icon={
          <IconContainer isSR>
            {validator.avatarUrl === undefined && <FirstLetterIcon label={validator.voteAccount} />}
            {validator.avatarUrl !== undefined && (
              <Image resource={validator.avatarUrl} alt="" width={32} height={32} />
            )}
          </IconContainer>
        }
        title={validator.name || validator.voteAccount}
        subtitle={
          <>
            <Trans i18nKey="solana.delegation.totalStake"></Trans>
            <Text style={{ marginLeft: 5 }}>
              {formatCurrencyUnit(unit, new BigNumber(validator.activeStake), {
                showCode: true,
              })}
            </Text>
          </>
        }
        onExternalLink={onExternalLink}
        unit={unit}
        sideInfo={
          <Box pr={1}>
            <Text textAlign="center" ff="Inter|SemiBold" fontSize={2}>
              {`${validator.commission} %`}
            </Text>
            <Text textAlign="center" fontSize={1}>
              <Trans i18nKey="solana.delegation.commission" />
            </Text>
          </Box>
        }
      ></ValidatorRow>
    );
  };

  return (
    <>
      <ValidatorSearchInput id="delegate-search-bar" search={search} onSearch={onSearch} />
      <Box ref={containerRef} id="delegate-list">
        <ScrollLoadingList
          data={validatorsFiltered}
          style={{ flex: "1 0 240px" }}
          renderItem={renderItem}
          noResultPlaceholder={
            validatorsFiltered.length <= 0 &&
            search.length > 0 && <NoResultPlaceholder search={search} />
          }
        />
      </Box>
    </>
  );
};

export default ValidatorField;