 //COMMON ENDPOINTS
  async getDefaultContext(period?: string, pricingViewId?: string): Promise<any> {
    const response = await this.fetch<FinopsCTX>
      (`/default-context?period=${period}&pricingViewId=${pricingViewId}`);
    return response;
  }



  //GLOBAL DASHBOARD
  async getGlobalSummary(period: string, pricingViewId: string): Promise<any> {
    const response = await this.fetch<FinopsSummaryDTO>
      (`/global/summary?period=${period}&pricingViewId=${pricingViewId}`);
    return response;
  }

  async getGlobalDomainCosts(period: string, pricingViewId: string): Promise<any> {
    const response = await this.fetch<{ items: { elementId: string, elementLabel: string, cost: number }[] }>
      (`/global/domains?period=${period}&pricingViewId=${pricingViewId}`);
    return response?.items;
  }

  async getGlobalTopApplications(period: string, pricingViewId: string): Promise<any> {
    const response = await this.fetch<{ items: { elementId: string, elementLabel: string, cost: number }[] }>
      (`/global/topApps?period=${period}&pricingViewId=${pricingViewId}`);
    return response?.items;
  }

  async getGlobalCostTrends(period: string, pricingViewId: string): Promise<any> {
    const response = await this.fetch<{ items: TrendPoint[] }>
      (`/global/trend?period=${period}&pricingViewId=${pricingViewId}`);
    return response?.items;
  }

  async getGlobalTopVariations(period: string, pricingViewId: string): Promise<any> {
    const response = await this.fetch<{ increases: VariationDTO[], decreases: VariationDTO[] }>
      (`/global/topVariations?period=${period}&pricingViewId=${pricingViewId}`);
    return response;
  }

  //DOMAIN DASHBOARD

  async getDomainSummary(domainId: string, period: string, pricingViewId: string): Promise<any> {
    const response = await this.fetch<{ increases: FinopsSummaryDTO[], decreases: VariationDTO[] }>
      (`/domains/${domainId}/summary?period=${period}&pricingViewId=${pricingViewId}`);
    return response;
  };
  async getDomainFamilyCosts(domainId: string, period: string, pricingViewId: string): Promise<any> {
    const response = await this.fetch<{ items: { increases: FinopsSummaryDTO[], decreases: { elementId: string, elementLabel: string, cost: number }[] } }>
      (`/domains/${domainId}/familyCosts?period=${period}&pricingViewId=${pricingViewId}`);
    return response?.items;
  };
  async getDomainEnvironmentCosts(domainId: string, period?: string, pricingViewId?: string): Promise<any> {
    const response = await this.fetch<{ items: { elementId: string, elementLabel: string, cost: number }[] }>
      (`/domains/${domainId}/envCosts?period=${period}&pricingViewId=${pricingViewId}`);
    return response?.items;
  };
  async getDomainTopApplications(domainId: string, period?: string, pricingViewId?: string): Promise<any> {
    const response = await this.fetch<{ items: { elementId: string, elementLabel: string, cost: number }[] }>
      (`/domains/${domainId}/topApps?period=${period}&pricingViewId=${pricingViewId}`);
    return response?.items;
  };
  async getDomainCostTrends(domainId: string, period?: string, pricingViewId?: string): Promise<any> {

    const response = await this.fetch<{ items: TrendPoint[] }>
      (`/domains/${domainId}/trend?period=${period}&pricingViewId=${pricingViewId}`);
    return response?.items;
  };
  async getDomainTopVariations(domainId: string, period?: string, pricingViewId?: string): Promise<any> {
    const response = await this.fetch<{ increases: VariationDTO[], decreases: VariationDTO[] }>
      (`/domains/${domainId}/topVariations?period=${period}&pricingViewId=${pricingViewId}`);
    return response;
  };



  //APPLICATION DASHBOARD
  async getApplicationSummary(applicationId: string, period?: string, pricingViewId?: string): Promise<any> {
    const response = await this.fetch<FinopsSummaryDTO>
      (`/applications/${applicationId}/summary?period=${period}&pricingViewId=${pricingViewId}`);
    return response;
  };

  async getApplicationDomainCosts(applicationId: string, period?: string, pricingViewId?: string): Promise<any> {
    const response = await this.fetch<{ items: { elementId: string, elementLabel: string, cost: number }[] }>
      (`/applications/${applicationId}/domainCosts?period=${period}&pricingViewId=${pricingViewId}`);
    return response?.items;
  };

  async getApplicationEnvironmentCosts(applicationId: string, period?: string, pricingViewId?: string): Promise<any> {
    const response = await this.fetch<{ items: { elementId: string, elementLabel: string, cost: number }[] }>
      (`/applications/${applicationId}/envCosts?period=${period}&pricingViewId=${pricingViewId}`);
    return response?.items;
  };

  async getApplicationTopProducts(applicationId: string, period?: string, pricingViewId?: string): Promise<any> {
    const response = await this.fetch<{ items: { elementId: string, elementLabel: string, cost: number }[] }>
      (`/applications/${applicationId}/topProducts?period=${period}&pricingViewId=${pricingViewId}`);
    return response?.items;
  };

  async getApplicationCostTrends(applicationId: string, period?: string, pricingViewId?: string): Promise<any> {
    const response = await this.fetch<{ items: TrendPoint[] }>
      (`/applications/${applicationId}/trend?period=${period}&pricingViewId=${pricingViewId}`);
    return response?.items;
  };


  //APPLICATIONS
  async getAllApplicationsCosts(period?: string, pricingViewId?: string): Promise<any> {
    const response = await this.fetch<{ items: { elementId: string, elementLabel: string, cost: number }[] }>
      (`/applications?period=${period}&pricingViewId=${pricingViewId}`);
    return response?.items;
  };
  //DOMAINS
  async getAllDomainsCosts(period?: string, pricingViewId?: string): Promise<any> {
    const response = await this.fetch<{ items: { elementId: string, elementLabel: string, cost: number }[] }>
      (`/domains?period=${period}&pricingViewId=${pricingViewId}`);
    return response?.items;
  };


  async getApplicationDomainTrend(applicationId: string, domainId: string, period?: string, pricingViewId?: string): Promise<any> {
    const response = await this.fetch<{ items: TrendPoint[] }>
      (`/applications/${applicationId}/domains/${domainId}/trend?period=${period}&pricingViewId=${pricingViewId}`);
    return response?.items;
  }


  async getAppDomainDetails(applicationId: string, domainId: string, period?: string, pricingViewId?: string): Promise<any> {
    const response = await this.fetch<DomainAppDetailApiResponse>
      (`/applications/${applicationId}/domains/${domainId}/details?period=${period}&pricingViewId=${pricingViewId}`);
    return response;
  }


  async getAppDomainSummary(applicationId: string, domainId: string, period?: string, pricingViewId?: string): Promise<any> {
    const response = await this.fetch<FinopsSummaryDTO>
      (`/applications/${applicationId}/domains/${domainId}/summary?period=${period}&pricingViewId=${pricingViewId}`);
    return response;
  }
-------- DTOs :



export type VariationDTO = {
    elementId: string,
    elementName: string,
    delta: number
}

export type CostDTO = {
    month: string,
    cost: number,
    currency: string
}


export type ProductLine = {
    productId: string;
    productName: string;
    uoLabel?: string; // unité d'œuvre (licence, GB, vCPU, etc.)
    quantity: number;
    unitPrice: number;
    cost: number; // quantity * unitPrice (déjà calculé côté API en V1)
    calcDetails?: CalcDetails;
};

export type FamilyBlock = {
    familyId: string;
    familyName: string;
    products: ProductLine[];
};

export type EnvBlock = {
    env: string;
    families: FamilyBlock[];
};

export type CalcDetails = {
    source?: string;
    rule?: string;
    pricingViewId?: string;
    runId?: string;
};

export type DetailFlatRow = {
    month: string;
    environment?: string;
    familyId?: string;
    familyName?: string;
    productId: string;
    productName: string;
    uoLabel?: string;
    quantity: number;
    unitPrice: number;
    cost: number;
    calcDetails?: CalcDetails;
};

export type DomainAppDetailApiResponse = {
    applicationId: string;
    domainId: string;
    domainName?: string;
    currency: string;
    rows: DetailFlatRow[];
};

export type FinopsCTX = {
    month: string;
    pv: string;
    currency: string;
    availablePeriods: SelectOption[];
    availablePricingViews: SelectOption[];
}


