import React, { useState, useCallback, useEffect } from 'react';
import {
  Map,
  AdvancedMarker,
  Pin,
  useMapsLibrary,
  MapCameraChangedEvent,
} from '@vis.gl/react-google-maps';
import {
  Search,
  Navigation,
  Plus,
  Check,
  Sparkles,
  FileSearch,
  Layers,
  X,
} from 'lucide-react';
import {
  DiscoveredPlace,
  WebsiteStatus,
  WEBSITE_STATUS_META,
  Lead,
  TEAM_EMPLOYEES,
  calculateLeadScore,
} from '../types';

interface MapProspectorProps {
  existingLeads: Lead[];
  darkMode?: boolean;
  isAdmin?: boolean;
  onSavePlaceAsLead: (place: DiscoveredPlace, assignedTo?: string) => Promise<void>;
  onSaveBatchPlaces: (places: DiscoveredPlace[], distributeToTeam?: boolean) => Promise<void>;
  onOpenCnpjModalForPlace: (place: DiscoveredPlace) => void;
  onGenerateProposalForPlace: (place: DiscoveredPlace) => void;
}

const BRAZIL_REGIONS = [
  { label: 'São Paulo - Pinheiros / Itaim', lat: -23.5674, lng: -46.6844 },
  { label: 'São Paulo - Paulista / Centro', lat: -23.5614, lng: -46.6559 },
  { label: 'Rio de Janeiro - Barra / Zona Sul', lat: -22.9848, lng: -43.2048 },
  { label: 'Belo Horizonte - Savassi', lat: -19.9364, lng: -43.9348 },
  { label: 'Curitiba - Batel / Centro', lat: -25.4411, lng: -49.2844 },
  { label: 'Porto Alegre - Moinhos de Vento', lat: -30.0256, lng: -51.2016 },
  { label: 'Brasília - Asa Sul / Asa Norte', lat: -15.7942, lng: -47.8822 },
  { label: 'Recife - Boa Viagem', lat: -8.1195, lng: -34.8999 },
];

const NICHE_PRESETS = [
  { label: 'Clínicas Odontológicas', query: 'Clínica Odontológica Dentista' },
  { label: 'Oficinas Mecânicas & Auto Center', query: 'Oficina Mecânica Auto Center' },
  { label: 'Escritórios de Contabilidade', query: 'Escritório de Contabilidade' },
  { label: 'Restaurantes & Bistrôs', query: 'Restaurante Bistrô Pizzaria' },
  { label: 'Clínicas de Estética & Salões', query: 'Clínica de Estética Salão de Beleza' },
  { label: 'Advocacia & Escritórios Jurídicos', query: 'Escritório de Advocacia Advogado' },
  { label: 'Pet Shops & Clínicas Veterinárias', query: 'Pet Shop Clínica Veterinária' },
  { label: 'Imobiliárias & Corretoras', query: 'Imobiliária Corretora de Imóveis' },
  { label: 'Academias & Studios Pilates', query: 'Academia Studio Pilates Crossfit' },
  { label: 'Padarias & Confeitarias', query: 'Padaria Panificadora Confeitaria' },
];

function classifyWebsiteStatus(url?: string | null): WebsiteStatus {
  if (!url || url.trim() === '') {
    return 'no_website';
  }
  const lower = url.toLowerCase();
  if (
    lower.includes('instagram.com') ||
    lower.includes('facebook.com') ||
    lower.includes('linktr.ee') ||
    lower.includes('wa.me') ||
    lower.includes('whatsapp.com') ||
    lower.includes('bio.site') ||
    lower.includes('beacons.ai')
  ) {
    return 'social_only';
  }
  if (lower.startsWith('http://')) {
    return 'outdated_website';
  }
  return 'active_website';
}

function extractCityFromAddress(address: string): string {
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length >= 3) {
    return parts[parts.length - 2] || '';
  }
  return parts[0] || '';
}

export const MapProspector: React.FC<MapProspectorProps> = ({
  existingLeads,
  darkMode = false,
  isAdmin = true,
  onSavePlaceAsLead,
  onSaveBatchPlaces,
  onOpenCnpjModalForPlace,
  onGenerateProposalForPlace,
}) => {
  const placesLib = useMapsLibrary('places');

  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: -23.5674,
    lng: -46.6844,
  });
  const [zoom, setZoom] = useState<number>(14);
  const [selectedNiche, setSelectedNiche] = useState<string>(
    NICHE_PRESETS[0].label
  );
  const [customQuery, setCustomQuery] = useState<string>(
    NICHE_PRESETS[0].query
  );
  const [regionInput, setRegionInput] = useState<string>('Pinheiros, São Paulo');
  const [radiusMeters, setRadiusMeters] = useState<number>(3000);
  const [onlyOpportunityFilter, setOnlyOpportunityFilter] =
    useState<boolean>(true);

  const [discoveredPlaces, setDiscoveredPlaces] = useState<DiscoveredPlace[]>(
    []
  );
  const [selectedPlace, setSelectedPlace] = useState<DiscoveredPlace | null>(
    null
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savingPlaceIds, setSavingPlaceIds] = useState<Record<string, boolean>>(
    {}
  );
  const [batchSaving, setBatchSaving] = useState<boolean>(false);

  const checkQuotaError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('OVER_QUERY_LIMIT') ||
      msg.includes('Quota')
    ) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  };

  const executePlacesSearch = useCallback(
    async (
      targetCenter: { lat: number; lng: number },
      queryText: string,
      nicheLabel: string,
      regionName: string
    ) => {
      if (!placesLib || !placesLib.Place) return;

      setIsSearching(true);
      setSearchError(null);

      try {
        const fullQuery = regionName.trim()
          ? `${queryText} em ${regionName.trim()}`
          : queryText;

        const request = {
          textQuery: fullQuery,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'websiteURI',
            'nationalPhoneNumber',
            'rating',
            'userRatingCount',
            'primaryTypeDisplayName',
            'googleMapsURI',
          ],
          locationBias: {
            center: targetCenter,
            radius: radiusMeters,
          },
          maxResultCount: 20,
          language: 'pt-BR',
          region: 'BR',
        };

        const { places } = await placesLib.Place.searchByText(request);
        const mapped: DiscoveredPlace[] = (places || []).map((p: any) => {
          const latVal =
            typeof p.location?.lat === 'function'
              ? p.location.lat()
              : Number(p.location?.lat ?? targetCenter.lat);
          const lngVal =
            typeof p.location?.lng === 'function'
              ? p.location.lng()
              : Number(p.location?.lng ?? targetCenter.lng);
          const websiteUrl = p.websiteURI ? String(p.websiteURI) : '';
          const addressStr = p.formattedAddress
            ? String(p.formattedAddress)
            : regionName;

          return {
            placeId: String(p.id || `place_${Math.random().toString(36).slice(2, 9)}`),
            companyName: String(p.displayName || 'Empresa Local'),
            niche: String(p.primaryTypeDisplayName || nicheLabel),
            address: addressStr,
            city: extractCityFromAddress(addressStr),
            phone: p.nationalPhoneNumber ? String(p.nationalPhoneNumber) : '',
            websiteUrl,
            websiteStatus: classifyWebsiteStatus(websiteUrl),
            rating: typeof p.rating === 'number' ? p.rating : 0,
            userRatingCount:
              typeof p.userRatingCount === 'number' ? p.userRatingCount : 0,
            lat: latVal,
            lng: lngVal,
            googleMapsUri: p.googleMapsURI ? String(p.googleMapsURI) : '',
          };
        });

        setDiscoveredPlaces(mapped);
        if (mapped.length > 0) {
          setCenter({ lat: mapped[0].lat, lng: mapped[0].lng });
          setSelectedPlace(mapped[0]);
        }
      } catch (err) {
        checkQuotaError(err);
        console.error('Erro na busca Places API (New):', err);
        setSearchError(
          'Não foi possível concluir a varredura na região selecionada. Tente ajustar o termo ou o raio.'
        );
      } finally {
        setIsSearching(false);
      }
    },
    [placesLib, radiusMeters]
  );

  // Perform initial scan once Places library loads
  useEffect(() => {
    if (placesLib && discoveredPlaces.length === 0 && !isSearching) {
      executePlacesSearch(
        center,
        customQuery,
        selectedNiche,
        regionInput
      );
    }
  }, [placesLib]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocalização não suportada neste navegador.');
      return;
    }
    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCenter(newCoords);
        setRegionInput('Minha Localização Atual');
        executePlacesSearch(newCoords, customQuery, selectedNiche, '');
      },
      () => {
        setIsSearching(false);
        setSearchError(
          'Permissão de localização negada. Escolha uma cidade ou digite um bairro.'
        );
      }
    );
  };

  const handleCameraChange = useCallback((ev: MapCameraChangedEvent) => {
    setCenter(ev.detail.center);
    setZoom(ev.detail.zoom);
  }, []);

  const filteredPlaces = discoveredPlaces.filter((place) => {
    if (!onlyOpportunityFilter) return true;
    return (
      place.websiteStatus === 'no_website' ||
      place.websiteStatus === 'social_only' ||
      place.websiteStatus === 'outdated_website'
    );
  });

  const opportunityCount = discoveredPlaces.filter(
    (p) =>
      p.websiteStatus === 'no_website' ||
      p.websiteStatus === 'social_only' ||
      p.websiteStatus === 'outdated_website'
  ).length;

  const getExistingLeadForPlace = (placeId: string): Lead | undefined =>
    existingLeads.find(
      (l) => l.googlePlaceId === placeId || l.id === placeId
    );

  const isAlreadySaved = (placeId: string) =>
    Boolean(getExistingLeadForPlace(placeId));

  const handleSaveSingle = async (
    place: DiscoveredPlace,
    assignedTo?: string
  ) => {
    setSavingPlaceIds((prev) => ({ ...prev, [place.placeId]: true }));
    try {
      await onSavePlaceAsLead(place, assignedTo);
    } finally {
      setSavingPlaceIds((prev) => ({ ...prev, [place.placeId]: false }));
    }
  };

  const handleSaveAllOpportunities = async (distributeToTeam = false) => {
    const unsaved = filteredPlaces.filter((p) => !isAlreadySaved(p.placeId));
    const targetList = unsaved.length > 0 ? unsaved : filteredPlaces;
    if (targetList.length === 0) return;
    setBatchSaving(true);
    try {
      await onSaveBatchPlaces(targetList, distributeToTeam);
    } finally {
      setBatchSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
            {/* Niche Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                01. Nicho de Negócio (Alvo da Proposta)
              </label>
              <select
                value={selectedNiche}
                onChange={(e) => {
                  const found = NICHE_PRESETS.find(
                    (n) => n.label === e.target.value
                  );
                  setSelectedNiche(e.target.value);
                  if (found) setCustomQuery(found.query);
                }}
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              >
                {NICHE_PRESETS.map((n) => (
                  <option key={n.label} value={n.label}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Region Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                02. Cidade, Bairro ou Região Alvo
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={regionInput}
                  onChange={(e) => setRegionInput(e.target.value)}
                  placeholder="Ex: Moema, São Paulo ou Curitiba"
                  className="flex-1 h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  title="Usar minha localização GPS"
                  className="h-10 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>GPS</span>
                </button>
              </div>
            </div>

            {/* Search Term / Radius */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                03. Palavra-Chave & Raio ({radiusMeters / 1000} km)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="Ex: Clínica Odontológica"
                  className="flex-1 h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <select
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-24 h-10 px-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                >
                  <option value={1500}>1.5 km</option>
                  <option value={3000}>3.0 km</option>
                  <option value={5000}>5.0 km</option>
                  <option value={10000}>10 km</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                executePlacesSearch(
                  center,
                  customQuery,
                  selectedNiche,
                  regionInput
                )
              }
              disabled={isSearching}
              className="h-10 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              <span>
                {isSearching ? 'Mapeando Região...' : 'Rastrear Empresas no Mapa'}
              </span>
            </button>
          </div>
        </div>

        {/* Quick Region Presets & Filter Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-1">Regiões rápidas:</span>
            {BRAZIL_REGIONS.map((reg) => (
              <button
                key={reg.label}
                type="button"
                onClick={() => {
                  setCenter({ lat: reg.lat, lng: reg.lng });
                  setRegionInput(reg.label);
                  executePlacesSearch(
                    { lat: reg.lat, lng: reg.lng },
                    customQuery,
                    selectedNiche,
                    reg.label
                  );
                }}
                className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
              >
                {reg.label.split(' - ')[0]} ({reg.label.split(' - ')[1]})
              </button>
            ))}
          </div>

          {/* Interactive Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setOnlyOpportunityFilter(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                onlyOpportunityFilter
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sem Site / Rede Social ({opportunityCount})
            </button>
            <button
              type="button"
              onClick={() => setOnlyOpportunityFilter(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                !onlyOpportunityFilter
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas Encontradas ({discoveredPlaces.length})
            </button>
          </div>
        </div>
      </div>

      {searchError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-xs">
          {searchError}
        </div>
      )}

      {/* Split Workspace: Map on Left (7 cols) + Extracted Business List on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-600 flex items-center gap-2">
              <span className="font-semibold text-slate-900">
                Radar Geolocalizado Google Maps
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-3">
              <span>Pino Vermelho: Sem Site / Oportunidade Off-Page</span>
              <span aria-hidden="true">·</span>
              <span>Pino Azul: Com Site</span>
            </div>
          </div>

          <div className="w-full h-[320px] sm:h-[420px] lg:h-[520px] relative">
            <Map
              key={darkMode ? 'map-dark' : 'map-light'}
              center={center}
              zoom={zoom}
              mapId="DEMO_MAP_ID"
              colorScheme={darkMode ? 'DARK' : 'LIGHT'}
              onCameraChanged={handleCameraChange}
              gestureHandling="greedy"
              clickableIcons={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%', outline: 'none', border: 'none' }}
            >
              {filteredPlaces.map((place) => {
                const isHighOpp =
                  place.websiteStatus === 'no_website' ||
                  place.websiteStatus === 'social_only' ||
                  place.websiteStatus === 'outdated_website';

                return (
                  <AdvancedMarker
                    key={place.placeId}
                    position={{ lat: place.lat, lng: place.lng }}
                    onClick={() => setSelectedPlace(place)}
                    title={place.companyName}
                  >
                    <Pin
                      background={isHighOpp ? '#e11d48' : '#2563eb'}
                      borderColor={isHighOpp ? '#9f1239' : '#1e40af'}
                      glyphColor="#ffffff"
                      scale={selectedPlace?.placeId === place.placeId ? 1.25 : 1.0}
                    />
                  </AdvancedMarker>
                );
              })}
            </Map>

            {/* Custom Selected Company Card Overlay (Zero White Border) */}
            {selectedPlace && (() => {
              const placeLead = getExistingLeadForPlace(selectedPlace.placeId);
              const score = calculateLeadScore({
                websiteStatus: selectedPlace.websiteStatus,
                niche: selectedPlace.niche,
                phone: selectedPlace.phone,
              });

              return (
                <div
                  className={`absolute bottom-3 left-3 right-3 sm:right-auto sm:w-[370px] z-20 rounded-xl p-4 shadow-2xl backdrop-blur-md space-y-3 ring-0 outline-none transition-all ${
                    darkMode
                      ? 'bg-slate-900/95 text-slate-100 border border-slate-700/80 shadow-black/70'
                      : 'bg-white text-slate-900 border border-slate-200/80 shadow-slate-400/40'
                  }`}
                  style={{ outline: 'none' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${score.tierBadgeClass}`}
                        >
                          {score.score} pts · {score.tierLabel}
                        </span>
                        <span className={darkMode ? 'text-slate-500' : 'text-slate-400'} aria-hidden="true"> · </span>
                        <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>{selectedPlace.niche}</span>
                      </div>
                      <h4 className={`text-sm font-bold leading-snug truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {selectedPlace.companyName}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPlace(null)}
                      className={`p-1.5 rounded-lg shrink-0 transition-colors outline-none ring-0 ${
                        darkMode
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Fechar card"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className={`text-xs leading-relaxed line-clamp-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {selectedPlace.address}
                  </p>

                  <div className="text-xs font-mono tabular-nums flex items-center gap-2">
                    {selectedPlace.phone && (
                      <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>
                        Tel: {selectedPlace.phone}
                      </span>
                    )}
                    {selectedPlace.rating > 0 && (
                      <span className="text-amber-500 font-semibold">
                        ★ {selectedPlace.rating.toFixed(1)} ({selectedPlace.userRatingCount})
                      </span>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onGenerateProposalForPlace(selectedPlace)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shadow-xs outline-none ring-0 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gerar Proposta Bot</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenCnpjModalForPlace(selectedPlace)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap outline-none ring-0 flex items-center gap-1.5 ${
                        darkMode
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <FileSearch className="w-3.5 h-3.5" />
                      <span>Consultar CNPJ</span>
                    </button>
                  </div>

                  {/* Admin Direct Employee Dispatch on Selected Card */}
                  {isAdmin && (
                    <div className={`pt-2 border-t flex flex-wrap items-center justify-between gap-1.5 text-xs ${
                      darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                    }`}>
                      <span className="font-medium shrink-0 text-[11px]">Enviar Lead P/:</span>
                      <div className="flex items-center gap-1">
                        {TEAM_EMPLOYEES.map((emp) => (
                          <button
                            key={emp.username}
                            type="button"
                            onClick={() => handleSaveSingle(selectedPlace, emp.username)}
                            className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors whitespace-nowrap outline-none ring-0 ${
                              placeLead?.assignedTo === emp.username
                                ? 'bg-emerald-600 text-white'
                                : darkMode
                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                            }`}
                            title={`Enviar lead para ${emp.displayName}`}
                          >
                            {emp.username.replace('funcionário', 'Func. ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Column: Discovered Businesses List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl flex flex-col h-[568px]">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Empresas Mapeadas na Região
              </h3>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                {filteredPlaces.length} negócios listados · {opportunityCount} sem
                site próprio
              </p>
            </div>

            {filteredPlaces.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleSaveAllOpportunities(true)}
                    disabled={batchSaving}
                    title="Envia Empresa X p/ funcionário01, Empresa Y p/ funcionário02 e Empresa Z p/ funcionário03"
                    className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>
                      {batchSaving
                        ? 'Distribuindo...'
                        : 'Distribuir p/ Funcionários (01, 02, 03)'}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSaveAllOpportunities(false)}
                  disabled={batchSaving}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {batchSaving ? 'Salvando...' : 'Salvar Todos'}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {isSearching ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="animate-pulse space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredPlaces.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm font-medium text-slate-700">
                  Nenhuma empresa encontrada com o filtro atual.
                </p>
                <p className="text-xs text-slate-500">
                  Experimente alternar para "Todas Encontradas" ou pesquise outro
                  nicho/bairro acima.
                </p>
                {onlyOpportunityFilter && discoveredPlaces.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOnlyOpportunityFilter(false)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg"
                  >
                    Mostrar todas as {discoveredPlaces.length} empresas da região
                  </button>
                )}
              </div>
            ) : (
              filteredPlaces.map((place) => {
                const existingLead = getExistingLeadForPlace(place.placeId);
                const saved = Boolean(existingLead);
                const statusMeta = WEBSITE_STATUS_META[place.websiteStatus];

                return (
                  <div
                    key={place.placeId}
                    onClick={() => {
                      setSelectedPlace(place);
                      setCenter({ lat: place.lat, lng: place.lng });
                    }}
                    className={`p-4 transition-colors cursor-pointer hover:bg-slate-50 ${
                      selectedPlace?.placeId === place.placeId
                        ? 'bg-blue-50/50'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        {/* Unboxed metadata with typographic separators */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          <span className={statusMeta.colorClass}>
                            {statusMeta.label}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{place.niche}</span>
                          {place.rating > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums text-amber-600">
                                ★ {place.rating.toFixed(1)} (
                                {place.userRatingCount})
                              </span>
                            </>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-slate-900 truncate">
                          {place.companyName}
                        </h4>

                        <p className="text-xs text-slate-600 line-clamp-1">
                          {place.address}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums pt-0.5">
                          <span>
                            {place.phone || 'Sem telefone público'}
                          </span>
                          {place.websiteUrl && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-[180px] text-slate-400">
                                {place.websiteUrl}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div
                      className="mt-3 flex flex-wrap items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onGenerateProposalForPlace(place)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Gerar Proposta Off-Page</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenCnpjModalForPlace(place)}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <FileSearch className="w-3.5 h-3.5" />
                        <span>Consultar CNPJ</span>
                      </button>

                      <button
                        type="button"
                        disabled={saved || savingPlaceIds[place.placeId]}
                        onClick={() => handleSaveSingle(place)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 transition-colors whitespace-nowrap ${
                          saved
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                        }`}
                      >
                        {saved ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              {existingLead?.assignedToName
                                ? `Com: ${existingLead.assignedToName}`
                                : 'Salvo no Funil'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              {savingPlaceIds[place.placeId]
                                ? 'Salvando...'
                                : 'Add Planilha'}
                            </span>
                          </>
                        )}
                      </button>

                      {/* Admin Direct Employee Assignment Selector */}
                      {isAdmin && (
                        <select
                          value={existingLead?.assignedTo || ''}
                          disabled={savingPlaceIds[place.placeId]}
                          onChange={(e) => {
                            const empUser = e.target.value;
                            if (empUser) {
                              handleSaveSingle(place, empUser);
                            }
                          }}
                          className="h-7 px-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-blue-600"
                        >
                          <option value="">
                            Enviar p/ Funcionário...
                          </option>
                          {TEAM_EMPLOYEES.map((emp) => (
                            <option key={emp.username} value={emp.username}>
                              Mandar p/ {emp.username} ({emp.displayName})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
