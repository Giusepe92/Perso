import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CalculateIcon from '@mui/icons-material/Calculate';
import PercentIcon from '@mui/icons-material/Percent';
import GridViewIcon from '@mui/icons-material/GridView';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';

import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';

import {
  BreakdownDonutWidget,
  KpiCards,
  RosettaDashboardPage,
  SelectOption,
  TotalCostTrendLineWidget,
  TrendPoint,
} from '../../../rosetta-core/src';
import { WidgetFrame } from '../../../rosetta-core/src/components/dashboard/WidgetFrame';
import {
  CalcDetails,
  DetailFlatRow,
  DomainAppDetailApiResponse,
  FinopsSummaryDTO,
} from '../utils/dashboardsTypes';
import { rosettaFinopsApiRef } from '../api';

type ViewMode = 'flat' | 'environment' | 'family' | 'product';

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function groupBy<T, K extends string | number>(
  items: T[],
  keyGetter: (item: T) => K,
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const key = keyGetter(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

function sumCost(rows: DetailFlatRow[]) {
  return rows.reduce((sum, row) => sum + row.cost, 0);
}

function CalcDetailsIcon({ details }: { details?: CalcDetails }) {
  if (!details) return null;

  return (
    <Tooltip
      arrow
      placement="left"
      title={
        <Box>
          <Typography variant="subtitle2">Détail de calcul</Typography>
          {details.rule && <Typography variant="body2">Règle : {details.rule}</Typography>}
          {details.source && <Typography variant="body2">Source : {details.source}</Typography>}
          {details.pricingViewId && (
            <Typography variant="body2">
              Pricing view : {details.pricingViewId}
            </Typography>
          )}
          {details.runId && <Typography variant="body2">Run : {details.runId}</Typography>}
        </Box>
      }
    >
      <IconButton size="small">
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

export function RosettaFinopsDetailedDashboard() {
  const finopApi = useApi(rosettaFinopsApiRef);
  const catalogApi = useApi(catalogApiRef);

  const { application_code, domain_code } = useParams<{
    application_code: string;
    domain_code: string;
  }>();

  const [viewMode, setViewMode] = useState<ViewMode>('flat');
  const [search, setSearch] = useState('');

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedPV, setSelectedPV] = useState<string>('');
  const [availablePeriods, setAvailablePeriods] = useState<SelectOption[]>([]);
  const [availablePVs, setAvailablePVs] = useState<SelectOption[]>([]);
  const [filtersReady, setFiltersReady] = useState(false);

  const [detail, setDetail] = useState<DomainAppDetailApiResponse | null>(null);
  const [summary, setSummary] = useState<FinopsSummaryDTO | null>(null);
  const [application, setApplication] = useState<Entity | undefined>(undefined);
  const [costTrends, setCostTrends] = useState<TrendPoint[]>([]);

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [costTrendsLoading, setCostTrendsLoading] = useState(true);

  const [variation, setVariation] = useState<number>(0);
  const [variationPercentage, setVariationPercentage] = useState<number>(0);

  /**
   * 1) Bootstrap unique : contexte par défaut
   */
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const ctx = await finopApi.getDefaultContext();
        if (cancelled) return;

        setAvailablePeriods(ctx.availablePeriods ?? []);
        setAvailablePVs(ctx.availablePricingViews ?? []);
        setSelectedMonth(ctx.month ?? '');
        setSelectedPV(ctx.pv ?? '');
        setFiltersReady(true);
      } catch (e) {
        console.error('Failed to load default context', e);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [finopApi]);

  /**
   * 2) Chargement métier : détail + summary + trend
   * se relance à chaque changement de période / pricing view
   */
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!application_code || !domain_code) return;
      if (!filtersReady || !selectedMonth || !selectedPV) return;

      setLoading(true);
      setSummaryLoading(true);
      setCostTrendsLoading(true);

      try {
        const [detailData, summaryData, trendData, applicationData] = await Promise.all([
          finopApi.getAppDomainDetails(
            application_code,
            domain_code,
            selectedMonth,
            selectedPV,
          ),
          finopApi.getAppDomainSummary(
            application_code,
            domain_code,
            selectedMonth,
            selectedPV,
          ),
          finopApi.getApplicationDomainTrend(
            application_code,
            domain_code,
            selectedMonth,
            selectedPV,
          ),
          catalogApi.getEntityByRef(`system:capfm/${application_code}`),
        ]);

        if (cancelled) return;

        setDetail(detailData ?? null);
        setSummary(summaryData ?? null);
        setCostTrends(trendData ?? []);
        setApplication(applicationData ?? undefined);

        const totalCost = summaryData?.totalCost ?? 0;
        const previousMonthCost = summaryData?.previousMonthCost ?? 0;
        const delta = totalCost - previousMonthCost;

        setVariation(delta);

        const pct =
          previousMonthCost && previousMonthCost !== 0
            ? (delta / previousMonthCost) * 100
            : 0;

        setVariationPercentage(Number.isFinite(pct) ? pct : 0);
      } catch (e) {
        console.error('Failed to load detail dashboard data', e);
        if (!cancelled) {
          setDetail(null);
          setSummary(null);
          setCostTrends([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSummaryLoading(false);
          setCostTrendsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [
    application_code,
    domain_code,
    selectedMonth,
    selectedPV,
    filtersReady,
    finopApi,
    catalogApi,
  ]);

  const rows = detail?.rows ?? [];

  const currencyFormatter = useMemo(() => {
    const currency = detail?.currency ?? 'EUR';
    return (value: number) =>
      new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
      }).format(value ?? 0);
  }, [detail?.currency]);

  const totalCost = useMemo(() => sumCost(rows), [rows]);

  const distinctProductsCount = useMemo(
    () => unique(rows.map(r => r.productId)).length,
    [rows],
  );

  const distinctEnvironmentsCount = useMemo(
    () => unique(rows.map(r => r.environment).filter(Boolean) as string[]).length,
    [rows],
  );

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;

    const s = search.toLowerCase();

    return rows.filter(r =>
      [
        r.environment ?? '',
        r.familyName ?? '',
        r.productName ?? '',
        r.uoLabel ?? '',
      ].some(v => v.toLowerCase().includes(s)),
    );
  }, [rows, search]);

  const rowsByEnvironment = useMemo(() => {
    return groupBy(filteredRows, r => r.environment || 'N/A');
  }, [filteredRows]);

  const rowsByFamily = useMemo(() => {
    return groupBy(filteredRows, r => r.familyName || 'N/A');
  }, [filteredRows]);

  const rowsByProduct = useMemo(() => {
    return groupBy(filteredRows, r => r.productName || 'N/A');
  }, [filteredRows]);

  const familySummary = useMemo(() => {
    const entries = Object.entries(groupBy(rows, r => r.familyName || 'N/A')).map(
      ([familyName, familyRows]) => ({
        familyName,
        cost: sumCost(familyRows),
      }),
    );
    return entries.sort((a, b) => b.cost - a.cost);
  }, [rows]);

  const familyBreakdownItems = useMemo(() => {
    return familySummary.map(row => ({
      elementId: row.familyName,
      elementLabel: row.familyName,
      cost: row.cost,
    }));
  }, [familySummary]);

  const environmentSummary = useMemo(() => {
    const entries = Object.entries(groupBy(rows, r => r.environment || 'N/A')).map(
      ([environment, envRows]) => ({
        environment,
        cost: sumCost(envRows),
      }),
    );
    return entries.sort((a, b) => b.cost - a.cost);
  }, [rows]);

  const environmentBreakdownItems = useMemo(() => {
    return environmentSummary.map(row => ({
      elementId: row.environment,
      elementLabel: row.environment,
      cost: row.cost,
    }));
  }, [environmentSummary]);

  return (
    <RosettaDashboardPage
      variant="finops"
      title={`${application?.metadata?.title ?? application_code ?? 'Application'} - ${
        detail?.domainName ?? domain_code ?? 'Domaine'
      }`}
      subtitle="Vue de détail au croisement application / domaine"
      helperText="Données mockées. Bientôt alimenté par l’API FinOps (facts + pricing view)."
      badges={[
        {
          label: 'Période',
          value: availablePeriods.find(period => period.value === selectedMonth)?.label ?? selectedMonth,
        },
        {
          label: 'Pricing',
          value: availablePVs.find(pv => pv.value === selectedPV)?.label ?? selectedPV,
        },
        { label: 'Application', value: application_code },
        { label: 'Domaine', value: domain_code },
        { label: 'Mode', value: 'Draft' },
      ]}
      viewByOptions={
        !filtersReady
          ? []
          : [
              {
                key: 'periods',
                label: 'Périodes',
                options: availablePeriods,
                defaultValue: selectedMonth,
                onSelectElement: (e: string) => setSelectedMonth(e),
              },
              {
                key: 'billing_periods',
                label: 'Visions budgétaires',
                options: availablePVs,
                defaultValue: selectedPV,
                onSelectElement: (e: string) => setSelectedPV(e),
              },
            ]
      }
    >
      <KpiCards
        title="Synthèse globale"
        subtitle="Synthèse"
        loading={summaryLoading}
        items={[
          {
            label: 'Total des coûts de la période',
            icon: <CalculateIcon />,
            value: currencyFormatter(totalCost),
          },
          {
            label: 'vs M-1',
            icon: <PercentIcon />,
            value: `${variationPercentage.toFixed(1)}%`,
            sub: currencyFormatter(variation),
          },
          {
            label: 'Produits consommés',
            icon: <DonutLargeIcon />,
            value: `${distinctProductsCount}`,
          },
          {
            label: 'Environnements',
            icon: <GridViewIcon />,
            value: `${distinctEnvironmentsCount}`,
          },
        ]}
      />

      <Grid container spacing={1}>
        <Grid item xs={12} md={6}>
          <BreakdownDonutWidget
            title="Répartition"
            subtitle="Par Environnements"
            views={[
              {
                key: 'env',
                label: 'Environnement',
                items: environmentBreakdownItems,
                topN: 8,
              },
              {
                key: 'family',
                label: 'Familles',
                items: familyBreakdownItems,
                topN: 7,
              },
            ]}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TotalCostTrendLineWidget
            title="Historique des coûts"
            subtitle="Évolution mensuelle"
            points={costTrends}
            loading={costTrendsLoading}
          />
        </Grid>
      </Grid>

      <Grid item xs={12} md={8}>
        <WidgetFrame title="Détail de consommation">
          {loading ? (
            <Skeleton variant="rectangular" sx={{ width: '100%', height: 320 }} />
          ) : (
            <Stack spacing={2}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                gap={2}
                flexWrap="wrap"
              >
                <Tabs
                  value={viewMode}
                  onChange={(_, value) => setViewMode(value)}
                >
                  <Tab label="Tableau" value="flat" />
                  <Tab label="Environnements" value="environment" />
                  <Tab label="Familles" value="family" />
                  <Tab label="Produits" value="product" />
                </Tabs>

                <TextField
                  size="small"
                  label="Recherche"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="env, famille, produit..."
                />
              </Box>

              {viewMode === 'flat' && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Env</TableCell>
                      <TableCell>Famille</TableCell>
                      <TableCell>Produit</TableCell>
                      <TableCell>UO</TableCell>
                      <TableCell align="right">Quantité</TableCell>
                      <TableCell align="right">Prix U</TableCell>
                      <TableCell align="right">Coût</TableCell>
                      <TableCell align="center">Calc</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRows.map((row, idx) => (
                      <TableRow key={`${row.productId}-${row.environment}-${idx}`}>
                        <TableCell>{row.environment ?? '-'}</TableCell>
                        <TableCell>{row.familyName ?? '-'}</TableCell>
                        <TableCell>{row.productName}</TableCell>
                        <TableCell>{row.uoLabel ?? '-'}</TableCell>
                        <TableCell align="right">{row.quantity}</TableCell>
                        <TableCell align="right">{currencyFormatter(row.unitPrice)}</TableCell>
                        <TableCell align="right">{currencyFormatter(row.cost)}</TableCell>
                        <TableCell align="center">
                          <CalcDetailsIcon details={row.calcDetails} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {viewMode === 'environment' && (
                <Stack spacing={1}>
                  {Object.entries(rowsByEnvironment).map(([env, envRows]) => (
                    <Accordion key={env}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box width="100%" display="flex" justifyContent="space-between">
                          <Typography>{env}</Typography>
                          <Typography>{currencyFormatter(sumCost(envRows))}</Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Famille</TableCell>
                              <TableCell>Produit</TableCell>
                              <TableCell>UO</TableCell>
                              <TableCell align="right">Quantité</TableCell>
                              <TableCell align="right">Prix U</TableCell>
                              <TableCell align="right">Coût</TableCell>
                              <TableCell align="center">Calc</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {envRows.map((row, idx) => (
                              <TableRow key={`${row.productId}-${idx}`}>
                                <TableCell>{row.familyName ?? '-'}</TableCell>
                                <TableCell>{row.productName}</TableCell>
                                <TableCell>{row.uoLabel ?? '-'}</TableCell>
                                <TableCell align="right">{row.quantity}</TableCell>
                                <TableCell align="right">{currencyFormatter(row.unitPrice)}</TableCell>
                                <TableCell align="right">{currencyFormatter(row.cost)}</TableCell>
                                <TableCell align="center">
                                  <CalcDetailsIcon details={row.calcDetails} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              )}

              {viewMode === 'family' && (
                <Stack spacing={1}>
                  {Object.entries(rowsByFamily).map(([family, familyRows]) => (
                    <Accordion key={family}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box width="100%" display="flex" justifyContent="space-between">
                          <Typography>{family}</Typography>
                          <Typography>{currencyFormatter(sumCost(familyRows))}</Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Env</TableCell>
                              <TableCell>Produit</TableCell>
                              <TableCell>UO</TableCell>
                              <TableCell align="right">Quantité</TableCell>
                              <TableCell align="right">Prix U</TableCell>
                              <TableCell align="right">Coût</TableCell>
                              <TableCell align="center">Calc</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {familyRows.map((row, idx) => (
                              <TableRow key={`${row.productId}-${idx}`}>
                                <TableCell>{row.environment ?? '-'}</TableCell>
                                <TableCell>{row.productName}</TableCell>
                                <TableCell>{row.uoLabel ?? '-'}</TableCell>
                                <TableCell align="right">{row.quantity}</TableCell>
                                <TableCell align="right">{currencyFormatter(row.unitPrice)}</TableCell>
                                <TableCell align="right">{currencyFormatter(row.cost)}</TableCell>
                                <TableCell align="center">
                                  <CalcDetailsIcon details={row.calcDetails} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              )}

              {viewMode === 'product' && (
                <Stack spacing={1}>
                  {Object.entries(rowsByProduct).map(([product, productRows]) => (
                    <Accordion key={product}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box width="100%" display="flex" justifyContent="space-between">
                          <Typography>{product}</Typography>
                          <Typography>{currencyFormatter(sumCost(productRows))}</Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Env</TableCell>
                              <TableCell>Famille</TableCell>
                              <TableCell>UO</TableCell>
                              <TableCell align="right">Quantité</TableCell>
                              <TableCell align="right">Prix U</TableCell>
                              <TableCell align="right">Coût</TableCell>
                              <TableCell align="center">Calc</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {productRows.map((row, idx) => (
                              <TableRow key={`${row.productId}-${idx}`}>
                                <TableCell>{row.environment ?? '-'}</TableCell>
                                <TableCell>{row.familyName ?? '-'}</TableCell>
                                <TableCell>{row.uoLabel ?? '-'}</TableCell>
                                <TableCell align="right">{row.quantity}</TableCell>
                                <TableCell align="right">{currencyFormatter(row.unitPrice)}</TableCell>
                                <TableCell align="right">{currencyFormatter(row.cost)}</TableCell>
                                <TableCell align="center">
                                  <CalcDetailsIcon details={row.calcDetails} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              )}
            </Stack>
          )}
        </WidgetFrame>
      </Grid>
    </RosettaDashboardPage>
  );
}
