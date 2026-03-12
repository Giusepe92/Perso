import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Chip,
    CircularProgress,
    Grid,
    MenuItem,
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
    IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { BreakdownDonutWidget, KpiCards, RosettaDashboardPage, SelectOption, TotalCostTrendLineWidget, TrendPoint } from '../../../rosetta-core/src';
import { WidgetFrame } from '../../../rosetta-core/src/components/dashboard/WidgetFrame';
import { CalcDetails, DetailFlatRow, DomainAppDetailApiResponse, FinopsSummaryDTO } from '../utils/dashboardsTypes';
import { rosettaFinopsApiRef } from '../api';
import { useApi } from '@backstage/core-plugin-api';

import CalculateIcon from '@mui/icons-material/Calculate';
import PercentIcon from '@mui/icons-material/Percent';
import GridViewIcon from '@mui/icons-material/GridView';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import { Entity } from '@backstage/catalog-model';
import { catalogApiRef } from '@backstage/plugin-catalog-react';

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
                        <Typography variant="body2">Pricing view : {details.pricingViewId}</Typography>
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
    useEffect(() => {
        async function bootstrap() {
            const ctx = await finopApi.getDefaultContext();
            setAvailablePeriods(prev => prev ?? ctx.availablePeriods);
            setAvailablePVs(prev => prev ?? ctx.availablePricingViews);
            setSelectedMonth(prev => prev ?? ctx.month);
            setSelectedPV(prev => prev ?? ctx.pv);
        }

        bootstrap();
    }, [finopApi])


    const { application_code, domain_code } = useParams<{
        application_code: string;
        domain_code: string;
    }>();

    const [detail, setDetail] = useState<DomainAppDetailApiResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const [viewMode, setViewMode] = useState<ViewMode>('flat');
    const [search, setSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string>();
    const [selectedPV, setSelectedPV] = useState<string>();
    const [summary, setSummary] = useState<FinopsSummaryDTO>();
    const [summaryLoding, setSummaryLoading] = useState(true);

    const [availablePeriods, setAvailablePeriods] = useState<SelectOption[]>();
    const [availablePVs, setAvailablePVs] = useState<SelectOption[]>();
    const [application, setApplication] = useState<Entity>();




    const currencyFormatter = useMemo(() => {
        const currency = detail?.currency ?? 'EUR';
        return (value: number) =>
            new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency,
            }).format(value);
    }, [detail]);



    const totalCost = useMemo(() => sumCost(detail?.rows ?? []), [detail]);

    const distinctProductsCount = useMemo(
        () => unique((detail?.rows ?? []).map(r => r.productId)).length,
        [detail],
    );

    const distinctEnvironmentsCount = useMemo(
        () => unique((detail?.rows ?? []).map(r => r.environment).filter(Boolean) as string[]).length,
        [detail],
    );

    const filteredRows = useMemo(() => {
        if (!search.trim()) return detail?.rows;
        const s = search.toLowerCase();

        return (detail?.rows ?? []).filter(r =>
            [
                r.environment ?? '',
                r.familyName ?? '',
                r.productName ?? '',
                r.uoLabel ?? '',
            ].some(v => v.toLowerCase().includes(s)),
        );
    }, [detail, search]);

    const rowsByEnvironment = useMemo(() => {
        return groupBy((filteredRows ?? []), r => r.environment || 'N/A');
    }, [filteredRows]);

    const rowsByFamily = useMemo(() => {
        return groupBy((filteredRows ?? []), r => r.familyName || 'N/A');
    }, [filteredRows]);

    const rowsByProduct = useMemo(() => {
        return groupBy((filteredRows ?? []), r => r.productName || 'N/A');
    }, [filteredRows]);

    const familySummary = useMemo(() => {
        const entries = Object.entries(groupBy((detail?.rows ?? []), r => r.familyName || 'N/A')).map(
            ([familyName, familyRows]) => ({
                familyName,
                cost: sumCost(familyRows),
            }),
        );
        return entries.sort((a, b) => b.cost - a.cost);
    }, [detail]);

    const familyBreakdownItems = useMemo(() => {
        return familySummary.map(row => ({
            elementId: row.familyName,
            elementLabel: row.familyName,
            cost: row.cost,
        }))
    }, [familySummary])

    const environmentSummary = useMemo(() => {
        const entries = Object.entries(groupBy((detail?.rows ?? []), r => r.environment || 'N/A')).map(
            ([environment, envRows]) => ({
                environment,
                cost: sumCost(envRows),
            }),
        );
        return entries.sort((a, b) => b.cost - a.cost);
    }, [detail]);

    const environmentBreakdownItems = useMemo(() => {
        return environmentSummary.map(row => ({
            elementId: row.environment,
            elementLabel: row.environment,
            cost: row.cost
        }))
    }, [environmentSummary]);

    const headerBadges = useMemo(() => {
        if (!detail) return [];
        return [
            { label: 'Application', value: detail.applicationId },
            { label: 'Domaine', value: detail.domainId },
            { label: 'Currency', value: detail.currency },
        ];
    }, [detail]);




    const [variation, setVariation] = useState<number>();
    const [variationPercentage, setVariationPercentage] = useState<number>();

    const [costTrends, setCostTrends] = useState<TrendPoint[]>();
    const [costTrendsLoading, setCostTrendsLoading] = useState(true);



    async function loadData() {
        if (!application_code || !domain_code) return;
        setLoading(true);
        finopApi.getAppDomainDetails(application_code, domain_code, selectedMonth, selectedPV).then((data) => setDetail).then(() => setLoading(false));

        setSummaryLoading(true)
        finopApi.getAppDomainSummary(application_code, domain_code, selectedMonth, selectedPV).then(smry => {
            setSummary(smry);
            setVariation((smry.totalCost - smry.previousMonthCost));
            setVariationPercentage(((smry.totalCost - smry.previousMonthCost) / 100));
        }).then(() => catalogApi.getEntityByRef(`system:capfm/${application_code}`)
            .then((data) => setApplication(data)))
            .finally(() => setSummaryLoading(false));

        setCostTrendsLoading(true);
        finopApi.getApplicationDomainTrend(application_code, domain_code, selectedMonth, selectedPV).then(data => {
            setCostTrends(data);
        }).finally(() => setCostTrendsLoading(false));
    }

    async function bootstrap() {
        finopApi.getDefaultContext().then(ctx => {
            setAvailablePeriods(ctx.availablePeriods);
            setAvailablePVs(ctx.availablePricingViews);
            setSelectedMonth(ctx.month);
            setSelectedPV(ctx.pv);
        })
    }

    useEffect(() => {
        if (!application_code || !domain_code) return;
        if (selectedMonth == undefined || selectedPV == undefined) {

            bootstrap()
        } else {
            loadData()
        };
    }, [selectedMonth, selectedPV, finopApi, catalogApi]);




    return (
        <RosettaDashboardPage
            variant="finops"
            title={`${application ? application?.metadata.title : application_code} -  ${detail?.domainName ?? domain_code}`}
            subtitle="Vue de détail au croisement application / domaine"
            helperText="Données mockées. Bientôt alimenté par l’API FinOps (facts + pricing view)."
            badges={[
                { label: 'Période', value: availablePeriods?.find(period => period.value === selectedMonth)?.label },
                { label: 'Pricing', value: availablePVs?.find(pv => pv.value === selectedPV)?.label },
                { label: 'Application', value: application_code },
                { label: 'Domaine', value: domain_code },
                { label: 'Mode', value: 'Draft' },
            ]}
            viewByOptions={[
                {
                    key: "periods",
                    label: "Périodes",
                    options: availablePeriods,
                    defaultValue: selectedMonth,
                    onSelectElement: (e: string) => { console.log(e); setSelectedMonth(e) }
                },
                {
                    key: "billing_periods",
                    label: "Visions budgétaires",
                    options: availablePVs,
                    defaultValue: selectedPV,
                    onSelectElement: (e: string) => { console.log(e); setSelectedPV(e) }
                }
            ]}>
            <KpiCards title="Synhtèse globale" subtitle="Synthèse" loading={summaryLoding} items={[
                {
                    label: "Total des coûts de la période",
                    icon: <CalculateIcon />,
                    value: `${currencyFormatter(totalCost)}`,
                },
                {
                    label: "vs M-1",
                    icon: <PercentIcon />,
                    value: `${variationPercentage}%`,
                    sub: `${variation ? currencyFormatter(variation) : ""}`
                },
                {
                    label: "Produits consommés",
                    icon: <DonutLargeIcon />,
                    value: `${distinctProductsCount}`,
                },
                {
                    label: "Environnements",
                    icon: <GridViewIcon />,
                    value: `${distinctEnvironmentsCount}`,
                }
            ]}
            />

            <Grid container spacing={1}>
                {/* Row 2 */}
                <Grid item xs={12} md={6}>
                    <BreakdownDonutWidget
                        title='Répartition'
                        subtitle="Par Environnements"
                        views={[
                            {
                                key: 'env',
                                label: 'Environnement',
                                items: environmentBreakdownItems, // ElementBreakdownItem[]
                                topN: 8
                            },
                            {
                                key: 'family',
                                label: 'Familles',
                                items: familyBreakdownItems, // ElementBreakdownItem[]
                                topN: 7
                            },
                        ]}
                        loading={loading}
                    />
                </Grid>


                {/* Trend row */}


                <Grid item xs={12} md={6}>
                    {loading ? (
                        <Skeleton variant="rectangular" sx={{ width: "100%", height: "100%" }} />
                    ) : (
                        <TotalCostTrendLineWidget
                            title="Historique des coûts"
                            subtitle="Évolution mensuelle"
                            points={costTrends}
                            loading={costTrendsLoading}
                        />
                    )}
                </Grid>
            </Grid>
            {/*<Grid item xs={12} md={4}>
                <Stack spacing={2}>
                    <WidgetFrame title="Répartition par famille" subtitle="Synthèse rapide">
                        {loading ? (
                            <Skeleton variant="rectangular" sx={{ width: "100%", height: "100%" }} />
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Famille</TableCell>
                                        <TableCell align="right">Coût</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {familySummary.map(row => (
                                        <TableRow key={row.familyName}>
                                            <TableCell>{row.familyName}</TableCell>
                                            <TableCell align="right">{currencyFormatter(row.cost)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </WidgetFrame>

                    <WidgetFrame title="Répartition par environnement" subtitle="Synthèse rapide">
                        {loading ? (
                            <Skeleton variant="rectangular" sx={{ width: "100%", height: "100%" }} />
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Env</TableCell>
                                        <TableCell align="right">Coût</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {environmentSummary.map(row => (
                                        <TableRow key={row.environment}>
                                            <TableCell>{row.environment}</TableCell>
                                            <TableCell align="right">{currencyFormatter(row.cost)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </WidgetFrame>
                </Stack>
            </Grid> */}

            {/* Main detail + side summary */}
            <Grid item xs={12} md={8}>
                <WidgetFrame
                    title="Détail de consommation"
                >
                    {loading ? (
                        <Skeleton variant="rectangular" sx={{ width: "100%", height: "100%" }} />
                    ) : (
                        <Stack spacing={2}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
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
                                        {(filteredRows ?? []).map((row, idx) => (
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
                                        <Accordion key={env} >
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
                                        <Accordion key={family} >
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
                                        <Accordion key={product} >
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
