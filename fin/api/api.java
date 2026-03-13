package fr.cagip.rosetta.service;

import fr.cagip.rosetta.dtos.*;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class FinopsApplicationServiceImpl implements FinopsApplicationService {
    @Override
    public SummaryResponse getSummary(String appId, String period, String pricingViewId) {
        return new SummaryResponse(
                period != null ? period : "2026-01-df",
                pricingViewId != null ? pricingViewId : "PV-2026-Q1-df",
                null,
                "EUR",
                23000,
                21800,
                230,
                6,
                35,
                6,
                356
        );
    }

    @Override
    public CostsResponse getDomains(String appId, String period, String pricingViewId) {
        return new CostsResponse(
                List.of(
                        new ElementCostDto("open", "Open", 4200),
                        new ElementCostDto("cluster", "Cluster", 2600),
                        new ElementCostDto("cyber", "CyberSécurité", 1800),
                        new ElementCostDto("Natif", "natif", 600)
                )
        );
    }

    @Override
    public CostsResponse getEnvironments(String appId, String period, String pricingViewId) {
        return new CostsResponse(
                List.of(
                        new ElementCostDto("dev", "Développment", 4200),
                        new ElementCostDto("ppd", "Préproduction", 2600),
                        new ElementCostDto("prd", "Production", 1800)
                )
        );
    }

    @Override
    public CostsResponse getTopProducts(String appId, String period, String pricingViewId) {
        return new CostsResponse(
                List.of(
                        new ElementCostDto("260518", "260518 - LICENCE JBOSS EAP", 400),
                        new ElementCostDto("260519", "260519 - INGENIERIE SPECIALISEE SERVEUR WEB", 260),
                        new ElementCostDto("260521", "260521 - INGENIERIE+ SGBD PREMIUM", 100)
                )
        );
    }

    @Override
    public TrendResponse getTrend(String appId, String period, String pricingViewId) {
        return new TrendResponse(
                List.of(
                        new TrendItemDto("Oct", 35000),
                        new TrendItemDto("Nov", 39500),
                        new TrendItemDto("Déc", 40000),
                        new TrendItemDto("Jan", 43100),
                        new TrendItemDto("Fév", 43000),
                        new TrendItemDto("Mar", 47000)
                )
        );
    }

    @Override
    public CostsResponse getAllApplications(String period, String pricingViewId) {
        return new CostsResponse(
                List.of(
                        new ElementCostDto("app-paiements", null, 14200),
                        new ElementCostDto("app-credit", null, 12600),
                        new ElementCostDto("app-sofinco", null, 11800),
                        new ElementCostDto("app-rosetta", null, 1600),
                        new ElementCostDto("F16", null, 14200)
                )
        );
    }

}


package fr.cagip.rosetta.service;

import fr.cagip.rosetta.dtos.DefaultContextResponse;
import fr.cagip.rosetta.dtos.SelectOptionDto;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

@Slf4j
@ApplicationScoped
public class FinopsContextServiceImpl implements FinopsContextService{
    @Override
    public DefaultContextResponse getDefaultContext(String period, String pricingViewId) {
        return new DefaultContextResponse(
                (period!=null && !period.equals("undefined"))?period:"2026-03",
                (pricingViewId!=null && !pricingViewId.equals("undefined") )?pricingViewId:"PV_Q2_2026",
                "EUR",
                List.of(
                        new SelectOptionDto("2025-09","Sep 2025"),
                        new SelectOptionDto("2025-10","Oct 2025"),
                        new SelectOptionDto("2025-11","Nov 2025"),
                        new SelectOptionDto("2025-12","Dec 2025"),
                        new SelectOptionDto("2026-01","Jan 2026"),
                        new SelectOptionDto("2026-02","Fev 2026"),
                        new SelectOptionDto("2026-03","Mar 2026")
                ),
                List.of(
                        new SelectOptionDto("PV_Q4_2026","V.Budget Q4 2025"),
                        new SelectOptionDto("PV_Q1_2026","V.Budget Q1 2026"),
                        new SelectOptionDto("PV_Q2_2026","V.Budget Q2 2026"),
                        new SelectOptionDto("PV_Q3_2026","V.Budget Q3 2026")
                )
        );
    }

}


package fr.cagip.rosetta.service;

import fr.cagip.rosetta.dtos.*;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class FinopsDetailsServiceImpl implements FinopsDetailsService {

    @Override
    public SummaryResponse getSummary(String appId, String domainId, String period, String pricingViewId) {
        return new SummaryResponse(
                period != null ? period : "2026-01-df",
                pricingViewId != null ? pricingViewId : "PV-2026-Q1-df",
                null,
                "EUR",
                23000,
                21800,
                null,
                null,
                null,
                null,
                null
        );
    }

    @Override
    public TrendResponse getTrend(String appId, String domainId, String period, String pricingViewId) {
        return new TrendResponse(
                List.of(
                        new TrendItemDto("Oct", 35000),
                        new TrendItemDto("Nov", 39500),
                        new TrendItemDto("Déc", 40000),
                        new TrendItemDto("Jan", 43100),
                        new TrendItemDto("Fév", 43000),
                        new TrendItemDto("Mar", 47000)
                )
        );
    }

    @Override
    public ApplicationDomainDetailsResponse getDetails(String appId, String domainId, String period, String pricingViewId) {
        return new ApplicationDomainDetailsResponse(
                appId,
                domainId,
                "EUR",
                List.of(
                        new ApplicationDomainDetailsRow(
                                "2026-03",
                                "prod",
                                "compute",
                                "Compute",
                                "21019",
                                "vCPU",
                                "nombre de vCPU",
                                120,
                                8.5,
                                1020,
                                new CalculationDetails(
                                        "batch-finops",
                                        "cost = quantity * unitPrice",

                                        "pv-default",

                                        "run-2026-03-01"
                                )


                        ),
                        new ApplicationDomainDetailsRow(
                                "2026-03",
                                "prod",
                                "compute",
                                "Compute",
                                "21010",
                                "vCPU",
                                "nombre de vCPU",
                                120,
                                8.5,
                                1020,
                                new CalculationDetails(
                                        "batch-finops",
                                        "cost = quantity * unitPrice",

                                        "pv-default",

                                        "run-2026-03-01"
                                )


                        ),
                        new ApplicationDomainDetailsRow(
                                "2026-03",
                                "prod",
                                "kubernetes",
                                "Kubernetes",
                                "21013",
                                "Pods",
                                "nombre de pods",
                                14,
                                10,
                                140,
                                new CalculationDetails(
                                        "batch-finops",
                                        "cost = quantity * unitPrice",

                                        "pv-default",

                                        "run-2026-03-01"
                                )


                        ),
                        new ApplicationDomainDetailsRow(
                                "2026-03",
                                "preprod",
                                "compute",
                                "Compute",
                                "21019",
                                "vCPU",
                                "nombre de vCPU",
                                120,
                                8.5,
                                1020,
                                new CalculationDetails(
                                        "batch-finops",
                                        "cost = quantity * unitPrice",

                                        "pv-default",

                                        "run-2026-03-01"
                                )


                        ),
                        new ApplicationDomainDetailsRow(
                                "2026-03",
                                "dev",
                                "vm",
                                "VM",
                                "21020",
                                "memory",
                                "nombre de GB",
                                120,
                                8.5,
                                1020,
                                new CalculationDetails(
                                        "batch-finops",
                                        "cost = quantity * unitPrice",

                                        "pv-default",

                                        "run-2026-03-01"
                                )
                        )
                )

        );
    }
}

package fr.cagip.rosetta.service;

import fr.cagip.rosetta.dtos.*;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class FinopsDomainServiceImpl implements FinopsDomainService {
    @Override
    public SummaryResponse getSummary(String domainId, String period, String pricingViewId) {
        return new SummaryResponse(
                period != null ? period : "2026-01-df",
                pricingViewId != null ? pricingViewId : "PV-2026-Q1-df",
                null,
                "EUR",
                23000,
                21800,
                230,
                6,
                35,
                6,
                356
        );
    }

    @Override
    public CostsResponse getFamilies(String domainId, String period, String pricingViewId) {
        return new CostsResponse(
                List.of(
                        new ElementCostDto("vm", "VM", 4200),
                        new ElementCostDto("citrix", "Citrix", 2600),
                        new ElementCostDto("sgbd", "SGBD", 1800),
                        new ElementCostDto("ubuntu", "Linux/Ubuntu", 600),
                        new ElementCostDto("windows", "Windows", 3200)
                )
        );
    }

    @Override
    public CostsResponse getEnvironments(String domainId, String period, String pricingViewId) {
        return new CostsResponse(
                List.of(
                        new ElementCostDto("dev", "Développment", 4200),
                        new ElementCostDto("ppd", "Préproduction", 2600),
                        new ElementCostDto("prd", "Production", 1800)
                )
        );
    }

    @Override
    public CostsResponse getTopApps(String domainId, String period, String pricingViewId) {
        return new CostsResponse(
                List.of(
                        new ElementCostDto("app-datahub", "APP DataHub", 420000),
                        new ElementCostDto("app-paiements", "APP Paiements", 260000),
                        new ElementCostDto("app-crm", "APP CRM", 180000),
                        new ElementCostDto("app-x", "APP X", 60000)
                )
        );
    }

    @Override
    public TrendResponse getTrend(String domainId, String period, String pricingViewId) {
        return new TrendResponse(
                List.of(
                        new TrendItemDto("Oct", 35000),
                        new TrendItemDto("Nov", 39500),
                        new TrendItemDto("Déc", 40000),
                        new TrendItemDto("Jan", 43100),
                        new TrendItemDto("Fév", 43000),
                        new TrendItemDto("Mar", 47000)
                )
        );
    }

    @Override
    public VariationResponse getTopVariations(String domainId, String period, String pricingViewId) {
        return new VariationResponse(
                List.of(
                        new VariationDto("app-a", "APP A", 850),
                        new VariationDto("app-b", "APP B", 500),
                        new VariationDto("app-c", "APP C", 300)
                ),
                List.of(
                        new VariationDto("app-x", "APP X", -900),
                        new VariationDto("app-y", "APP Y", -550),
                        new VariationDto("app-z", "APP Z", -350)
                )
        );
    }

    @Override
    public CostsResponse getAllDomains(String period, String pricingViewId) {
        return new CostsResponse(
                List.of(
                        new ElementCostDto("open", "Open", 14200),
                        new ElementCostDto("cluster", "Cluster", 12600),
                        new ElementCostDto("cyber", "CyberSécurité", 1800),
                        new ElementCostDto("Natif", "natif", 11600)
                )
        );
    }
}
package fr.cagip.rosetta.service;

import fr.cagip.rosetta.dtos.*;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class FinopsGlobalServiceImpl implements FinopsGlobalService {
    @Override
    public SummaryResponse getSummary(String period, String pricingViewId) {
        return new SummaryResponse(
                period != null ? period : "2026-01-df",
                pricingViewId != null ? pricingViewId : "PV-2026-Q1-df",
                null,
                "EUR",
                23000,
                21800,
                230,
                6,
                null,
                null,
                null
        );
    }

    @Override
    public CostsResponse getDomains(String period, String pricingViewId) {
        return new CostsResponse(
                List.of(
                        new ElementCostDto("open", "OPEN", 420000),
                        new ElementCostDto("k8s", "Natif", 260000),
                        new ElementCostDto("net", "Réseau", 180000),
                        new ElementCostDto("sec", "Sécurité", 60000),
                        new ElementCostDto("cyber", "Cyber", 320000)
                )
        );
    }

    @Override
    public CostsResponse getTopApps(String period, String pricingViewId) {
        return new CostsResponse(
                List.of(
                        new ElementCostDto("app-datahub", "APP DataHub", 420000),
                        new ElementCostDto("app-paiements", "APP Paiements", 260000),
                        new ElementCostDto("app-crm", "APP CRM", 180000),
                        new ElementCostDto("app-x", "APP X", 60000)
                )
        );
    }


    @Override
    public TrendResponse getTrend(String period, String pricingViewId) {
        return new TrendResponse(
                List.of(
                        new TrendItemDto("Oct", 35000),
                        new TrendItemDto("Nov", 39500),
                        new TrendItemDto("Déc", 40000),
                        new TrendItemDto("Jan", 43100),
                        new TrendItemDto("Fév", 43000),
                        new TrendItemDto("Mar", 47000)
                )
        );
    }

    @Override
    public VariationResponse getTopVariations(String period, String pricingViewId) {
        return new VariationResponse(
                List.of(
                        new VariationDto("app-a", "APP A", 850),
                        new VariationDto("app-b", "APP B", 500),
                        new VariationDto("app-c", "APP C", 300)
                ),
                List.of(
                        new VariationDto("app-x", "APP X", -900),
                        new VariationDto("app-y", "APP Y", -550),
                        new VariationDto("app-z", "APP Z", -350)
                )
        );
    }
}




package fr.cagip.rosetta.dtos;

import java.util.List;

public record ApplicationDomainDetailsResponse(
        String appId,
        String domainId,
        String currency,
        List<ApplicationDomainDetailsRow> rows
) {
}



package fr.cagip.rosetta.dtos;

public record ApplicationDomainDetailsRow(
        String month,
        String environment,
        String familyId,
        String familyName,
        String productId,
        String productName,
        String uoLabel,
        Number quantity,
        Number unitPrice,
        Number cost,
        CalculationDetails calcDetails
) {
}


package fr.cagip.rosetta.dtos;

public record CalculationDetails(
        String source,
        String rule,
        String pricingViewId,
        String runId
) {
}

package fr.cagip.rosetta.dtos;

import java.util.List;

public record CostsResponse(
        List<ElementCostDto> items
) {
}

package fr.cagip.rosetta.dtos;

import java.util.List;

public record DefaultContextResponse(
        String month,
        String pv,
        String currency,
        List<SelectOptionDto> availablePeriods,
        List<SelectOptionDto> availablePricingViews
) {
}
package fr.cagip.rosetta.dtos;

public record ElementCostDto(
        String elementId,
        String elementLabel,
        Number cost) {
}


package fr.cagip.rosetta.dtos;

public record SelectOptionDto(
        String value,
        String label
) {
}

package fr.cagip.rosetta.dtos;

public record SummaryResponse(
        String period,
        String pricingView,
        String elementId,
        String currency,
        Number totalCost,
        Number previousMonthCost,
        Number appsCovered,
        Number domainsCovered,
        Number familiesCovered,
        Number environmentsCovered,
        Number productsCovered
) {
}

package fr.cagip.rosetta.dtos;

public record TrendItemDto(
        String period,
        Number value
) {
}

package fr.cagip.rosetta.dtos;

import java.util.List;

public record TrendResponse(
        List<TrendItemDto> items
) {
}

package fr.cagip.rosetta.dtos;

public record VariationDto(
        String elementId,
        String elementName,
        Number delta) {
}

package fr.cagip.rosetta.dtos;

import java.util.List;

public record VariationResponse(
        List<VariationDto> increases,
        List<VariationDto> decreases

) {
}

